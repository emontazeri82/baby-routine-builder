import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  lte,
  gte,
  or,
  sql,
} from "drizzle-orm";
import { CronExpressionParser } from "cron-parser";

import { db } from "@/lib/db";
import {
  activities,
  activityTypes,
  babies,
  notificationLogs,
  reminderActionLogs,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";
import { generateOccurrencesForReminder, generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";

const scheduleTypes = ["one-time", "recurring", "interval"] as const;
const reminderStatuses = ["active", "paused", "cancelled"] as const;

type ReminderStatus = (typeof reminderStatuses)[number];
export type ReminderCurrentState =
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "completed"
  | "skipped"
  | "last_completed"
  | "last_skipped"
  | "upcoming";
type NotificationStatus =
  | "queued"
  | "sent"
  | "failed"
  | "retrying"
  | "permanently_failed";

type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export const scheduleMetadataSchema = z.object({
  type: z.enum(["daily", "weekly", "custom", "interval"]),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  intervalMinutes: z.number().int().positive().optional(),
});

export const createReminderInputSchema = z
  .object({
    babyId: z.string().uuid(),
    reminderMode: z.enum(["activity", "simple"]).default("activity"),
    scheduleType: z.enum(scheduleTypes),
    remindAt: z.coerce.date(),
    status: z.enum(reminderStatuses).default("active"),

    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    cronExpression: z.string().trim().min(1).max(255).optional(),
    scheduleMetadata: scheduleMetadataSchema.optional(),
    repeatIntervalMinutes: z.number().int().positive().optional(),
    adaptiveEnabled: z.boolean().optional(),
    allowSnooze: z.boolean().optional(),
    maxSnoozes: z.number().int().min(0).optional(),
    priority: z.number().int().min(1).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).optional(),
    activityTypeId: z.string().uuid().optional(),
    activityTypeSlug: z.string().trim().min(1).max(64).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.remindAt < new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remind time must be in the future.",
        path: ["remindAt"],
      });
    }

    if (value.scheduleType === "one-time") {
      if (value.cronExpression) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cronExpression is not allowed for one-time reminders",
          path: ["cronExpression"],
        });
      }
      if (value.scheduleMetadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduleMetadata is not required for one-time reminders",
          path: ["scheduleMetadata"],
        });
      }
    }

    if (value.scheduleType === "recurring") {
      if (!value.cronExpression) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cronExpression is required for recurring reminders",
          path: ["cronExpression"],
        });
      }
      if (!value.scheduleMetadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduleMetadata is required for recurring reminders",
          path: ["scheduleMetadata"],
        });
      }
    }

    if (value.scheduleType === "interval" && !value.repeatIntervalMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "repeatIntervalMinutes is required for interval reminders",
        path: ["repeatIntervalMinutes"],
      });
    }

    if (value.allowSnooze === false && value.maxSnoozes !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxSnoozes should not be sent when snooze is disabled",
        path: ["maxSnoozes"],
      });
    }

    if (
      value.reminderMode === "activity" &&
      !value.activityTypeId &&
      !value.activityTypeSlug
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Activity type is required for activity reminders",
        path: ["activityTypeId"],
      });
    }
  });

export const updateReminderInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    remindAt: z.coerce.date().optional(),
    scheduleType: z.enum(scheduleTypes).optional(),
    status: z.enum(reminderStatuses).optional(),
    cronExpression: z.string().trim().max(255).optional().nullable(),
    repeatIntervalMinutes: z.number().int().positive().optional().nullable(),
    adaptiveEnabled: z.boolean().optional(),
    allowSnooze: z.boolean().optional(),
    maxSnoozes: z.number().int().min(0).optional().nullable(),
    priority: z.number().int().min(1).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).optional().nullable(),
    scheduleMetadata: scheduleMetadataSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const snoozeInputSchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60).default(15),
  occurrenceId: z.string().uuid().optional(),
});

export const rescheduleInputSchema = z.object({
  remindAt: z
    .coerce
    .date()
    .refine((value) => value > new Date(), {
      message: "Reschedule time must be in the future.",
    }),
  occurrenceId: z.string().uuid().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;

export class ReminderValidationError extends Error {
  fieldErrors: Record<string, string[] | undefined>;

  constructor(
    message: string,
    fieldErrors: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = "ReminderValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ReminderDomainError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "ReminderDomainError";
    this.code = code;
  }
}

export function isReminderDomainError(error: unknown): error is ReminderDomainError {
  return error instanceof ReminderDomainError;
}

function throwDomainError(code: string, message?: string): never {
  throw new ReminderDomainError(code, message);
}

function appendScheduleMetadataToTags(params: {
  existingTags: unknown;
  labels?: string[] | null;
  scheduleMetadata?: z.infer<typeof scheduleMetadataSchema>;
}) {
  const { existingTags, labels, scheduleMetadata } = params;
  const base =
    typeof existingTags === "object" && existingTags !== null
      ? (existingTags as Record<string, unknown>)
      : {};

  const prevLabels = Array.isArray(base.labels)
    ? base.labels.filter((v): v is string => typeof v === "string")
    : [];

  return {
    ...base,
    labels: labels ?? prevLabels,
    scheduleMetadata: scheduleMetadata ?? base.scheduleMetadata ?? null,
  };
}

async function assertBabyOwnership(params: { babyId: string; userId: string }) {
  const baby = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, params.babyId), eq(babies.userId, params.userId)))
    .limit(1);

  return baby.length > 0;
}

async function getReminderOwnedByUser(params: { reminderId: string; userId: string }) {
  const reminder = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, params.reminderId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!reminder) return null;

  const owned = await assertBabyOwnership({
    babyId: reminder.babyId,
    userId: params.userId,
  });

  return owned ? reminder : null;
}

async function logEvent(params: {
  tx: DbExecutor;
  reminderId: string;
  occurrenceId?: string | null;
  userId?: string | null;
  actionType:
  | "created"
  | "completed"
  | "skipped"
  | "snoozed"
  | "rescheduled"
  | "cancelled";
  previousValue?: unknown;
  newValue?: unknown;
}) {
  await params.tx.insert(reminderActionLogs).values({
    reminderId: params.reminderId,
    occurrenceId: params.occurrenceId ?? null,
    userId: params.userId ?? null,
    actionType: params.actionType,
    previousValue: (params.previousValue ?? null) as Record<string, unknown> | null,
    newValue: (params.newValue ?? null) as Record<string, unknown> | null,
  });
}

function validateReminderScheduleInvariants(params: {
  scheduleType: (typeof scheduleTypes)[number];
  cronExpression: string | null;
  repeatIntervalMinutes: number | null;
  scheduleMetadata?: unknown;
  strictRecurring?: boolean;
  strictInterval?: boolean;
}) {
  const issues: Record<string, string[]> = {};

  const pushIssue = (key: string, msg: string) => {
    issues[key] = [...(issues[key] ?? []), msg];
  };

  if (params.scheduleType === "one-time") {
    if (params.cronExpression) {
      pushIssue("cronExpression", "One-time reminders cannot have cronExpression");
    }
    if (params.repeatIntervalMinutes) {
      pushIssue(
        "repeatIntervalMinutes",
        "One-time reminders cannot have repeatIntervalMinutes"
      );
    }
  }

  if (params.scheduleType === "recurring" && params.strictRecurring) {
    if (!params.cronExpression) {
      pushIssue("cronExpression", "Recurring reminders require cronExpression");
    }
    if (!params.scheduleMetadata) {
      pushIssue("scheduleMetadata", "Recurring reminders require scheduleMetadata");
    }
  }

  if (
    params.scheduleType === "interval" &&
    params.strictInterval &&
    !params.repeatIntervalMinutes
  ) {
    pushIssue(
      "repeatIntervalMinutes",
      "Interval reminders require repeatIntervalMinutes"
    );
  }

  if (Object.keys(issues).length > 0) {
    throw new ReminderValidationError(
      "Reminder schedule validation failed",
      issues
    );
  }
}

type StoredScheduleMetadata = {
  type?: "daily" | "weekly" | "custom" | "interval";
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
};

function getStoredScheduleMetadata(tags: unknown) {
  if (!tags || typeof tags !== "object") return null;
  const raw = (tags as Record<string, unknown>).scheduleMetadata;
  if (!raw || typeof raw !== "object") return null;
  return raw as StoredScheduleMetadata;
}

function fallbackDailyCronFromRemindAt(remindAt: Date) {
  return `${remindAt.getMinutes()} ${remindAt.getHours()} * * *`;
}

function resolveRecurringCronExpressionFromReminder(reminder: {
  cronExpression: string | null;
  remindAt: Date;
  tags: unknown;
}) {
  if (reminder.cronExpression?.trim()) return reminder.cronExpression.trim();

  const meta = getStoredScheduleMetadata(reminder.tags);
  if (
    meta &&
    Number.isInteger(meta.hour) &&
    Number.isInteger(meta.minute) &&
    meta.hour! >= 0 &&
    meta.hour! <= 23 &&
    meta.minute! >= 0 &&
    meta.minute! <= 59
  ) {
    const h = meta.hour!;
    const m = meta.minute!;

    if (meta.type === "weekly") return `${m} ${h} * * 1-5`;
    if (meta.type === "custom") {
      const days = (meta.daysOfWeek ?? [])
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .join(",");
      if (days) return `${m} ${h} * * ${days}`;
    }
    return `${m} ${h} * * *`;
  }

  return fallbackDailyCronFromRemindAt(reminder.remindAt);
}
const occurrenceCounts = db
  .select({
    reminderId: reminderOccurrences.reminderId,

    pendingOccurrences: sql<number>`
      COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'pending')
    `.as("pending_occurrences"),

    completedOccurrences: sql<number>`
      COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'completed')
    `.as("completed_occurrences"),

    skippedOccurrences: sql<number>`
      COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'skipped')
    `.as("skipped_occurrences"),

    expiredOccurrences: sql<number>`
      COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'expired')
    `.as("expired_occurrences"),
  })
  .from(reminderOccurrences)
  .groupBy(reminderOccurrences.reminderId)
  .as("occurrenceCounts");


async function expireOldOccurrences() {
  const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await db
    .update(reminderOccurrences)
    .set({ status: "expired" })
    .where(
      and(
        eq(reminderOccurrences.status, "pending"),
        lte(reminderOccurrences.scheduledFor, expirationTime)
      )
    );
}
export async function listReminders(params: {
  babyId: string;
  userId: string;
  status: ReminderStatus | "all";
}) {
  await expireOldOccurrences();

  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  await generateOccurrencesForActiveReminders({
    babyId: params.babyId,
    horizonDays: 14,
    maxOccurrences: 50,
  });

  const whereClause =
    params.status === "all"
      ? eq(reminders.babyId, params.babyId)
      : and(eq(reminders.babyId, params.babyId), eq(reminders.status, params.status));

  const babyTimezone =
    (
      await db
        .select({ timezone: babies.timezone })
        .from(babies)
        .where(eq(babies.id, params.babyId))
        .limit(1)
        .then((rows) => rows[0]?.timezone)
    ) ?? "UTC";

  const data = await db
    .select({
      id: reminders.id,
      babyId: reminders.babyId,
      activityTypeId: reminders.activityTypeId,
      title: reminders.title,
      description: reminders.description,
      scheduleType: reminders.scheduleType,
      status: reminders.status,
      remindAt: reminders.remindAt,
      cronExpression: reminders.cronExpression,
      repeatIntervalMinutes: reminders.repeatIntervalMinutes,
      allowSnooze: reminders.allowSnooze,
      adaptiveEnabled: reminders.adaptiveEnabled,
      priority: reminders.priority,
      tags: reminders.tags,
      createdAt: reminders.createdAt,
      currentState: sql<ReminderCurrentState>`(
        case
          when ${reminders.status} = 'cancelled' then 'cancelled'
          when ${reminders.scheduleType} = 'one-time'
            and ${reminders.status} = 'active'
            and ${reminders.remindAt} <= now()
            and not exists (
              select 1
              from reminder_occurrences ro_any
              where ro_any.reminder_id = ${reminders.id}
            ) then 'overdue'
          when exists (
            select 1
            from reminder_occurrences ro
            where ro.reminder_id = ${reminders.id}
              and ro.status = 'pending'
              and ro.scheduled_for <= now()
              and (
                ro.snooze_until is null
                or ro.snooze_until <= now()
              )
          ) then 'overdue'
          when exists (
            select 1
            from reminder_occurrences ro
            where ro.reminder_id = ${reminders.id}
              and ro.status = 'pending'
              and ro.snooze_until > now()
          ) then 'snoozed'
          when ${reminders.scheduleType} = 'one-time'
            and (
              select ro.status
              from reminder_occurrences ro
              where ro.reminder_id = ${reminders.id}
                and ro.status in ('completed', 'skipped')
              order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
              limit 1
            ) = 'completed' then 'completed'
          when ${reminders.scheduleType} = 'one-time'
            and (
              select ro.status
              from reminder_occurrences ro
              where ro.reminder_id = ${reminders.id}
                and ro.status in ('completed', 'skipped')
              order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
              limit 1
            ) = 'skipped' then 'skipped'
          when ${reminders.scheduleType} in ('recurring', 'interval')
            and (
              select ro.status
              from reminder_occurrences ro
              where ro.reminder_id = ${reminders.id}
                and ro.status in ('completed', 'skipped')
              order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
              limit 1
            ) = 'completed' then 'last_completed'
          when ${reminders.scheduleType} in ('recurring', 'interval')
            and (
              select ro.status
              from reminder_occurrences ro
              where ro.reminder_id = ${reminders.id}
                and ro.status in ('completed', 'skipped')
              order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
              limit 1
            ) = 'skipped' then 'last_skipped'
          else 'upcoming'
        end
      )`,
      nextUpcomingAt: sql<Date | null>`(
        select ro.scheduled_for
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.scheduled_for > now()
        order by ro.scheduled_for asc
        limit 1
      )`,
      overdueCount: sql<number>`(
        (
          select count(*)::int
          from reminder_occurrences ro
          where ro.reminder_id = ${reminders.id}
            and ro.status = 'pending'
            and ro.scheduled_for <= now()
            and (
              ro.snooze_until is null
              or ro.snooze_until <= now()
            )
        ) + (
          case
            when ${reminders.scheduleType} = 'one-time'
              and ${reminders.status} = 'active'
              and ${reminders.remindAt} <= now()
              and not exists (
                select 1
                from reminder_occurrences ro_any
                where ro_any.reminder_id = ${reminders.id}
              )
            then 1
            else 0
          end
        )
      )`,
      hasDueOccurrence: sql<boolean>`(
        exists(
          select 1
          from reminder_occurrences ro
          where ro.reminder_id = ${reminders.id}
            and ro.status = 'pending'
            and ro.scheduled_for <= now()
            and (
              ro.snooze_until is null
              or ro.snooze_until <= now()
            )
        ) or (
          ${reminders.scheduleType} = 'one-time'
          and ${reminders.status} = 'active'
          and ${reminders.remindAt} <= now()
          and not exists (
            select 1
            from reminder_occurrences ro_any
            where ro_any.reminder_id = ${reminders.id}
          )
        )
      )`,
      pendingOccurrences: sql<number>`
        coalesce(${occurrenceCounts.pendingOccurrences},0)
        `,
      completedOccurrences: sql<number>`
        coalesce(${occurrenceCounts.completedOccurrences},0)
        `,
      skippedOccurrences: sql<number>`
        coalesce(${occurrenceCounts.skippedOccurrences},0)
        `,
      expiredOccurrences: sql<number>`
        coalesce(${occurrenceCounts.expiredOccurrences},0)
        `,
      lastResolvedStatus: sql<"completed" | "skipped" | null>`(
        select ro.status
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status in ('completed', 'skipped')
        order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
        limit 1
      )`,
      lastResolvedAt: sql<Date | null>`(
        select coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for)
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status in ('completed', 'skipped')
        order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
        limit 1
      )`,
      lastCompletedAt: sql<Date | null>`(
        select max(ro.completed_at)
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'completed'
      )`,
      lastScheduledFor: sql<Date | null>`(
        select max(ro.scheduled_for)
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
      )`,
      snoozedUntil: sql<Date | null>`(
        select ro.snooze_until
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.snooze_until is not null
          and ro.snooze_until > now()
        order by ro.scheduled_for asc
        limit 1
      )`,
    })
    .from(reminders)
    .leftJoin(
      occurrenceCounts,
      eq(occurrenceCounts.reminderId, reminders.id)
    )
    .where(whereClause)
    .orderBy(desc(reminders.createdAt));
  console.log("REMINDERS QUERY RESULT", data);

  const now = new Date();

  const withNextSchedule = data.map((reminder) => {
    let nextScheduleAt: Date | null = reminder.nextUpcomingAt;

    if (!nextScheduleAt && reminder.scheduleType === "one-time") {
      nextScheduleAt =
        reminder.status === "active" && reminder.remindAt > now
          ? reminder.remindAt
          : null;
    }

    if (!nextScheduleAt && reminder.scheduleType === "interval") {
      if (reminder.repeatIntervalMinutes && reminder.repeatIntervalMinutes > 0) {
        const intervalMs = reminder.repeatIntervalMinutes * 60 * 1000;
        const anchor = new Date(reminder.remindAt).getTime();
        const nowMs = now.getTime();
        const nextMs =
          anchor > nowMs
            ? anchor
            : anchor + Math.ceil((nowMs - anchor) / intervalMs) * intervalMs;
        nextScheduleAt = new Date(nextMs);
      }
    }

    if (!nextScheduleAt && reminder.scheduleType === "recurring") {
      const cronExpression = resolveRecurringCronExpressionFromReminder({
        cronExpression: reminder.cronExpression,
        remindAt: new Date(reminder.remindAt),
        tags: reminder.tags,
      });
      try {
        const iter = CronExpressionParser.parse(cronExpression, {
          currentDate: now,
          tz: babyTimezone,
        });
        nextScheduleAt = iter.next().toDate();
      } catch {
        nextScheduleAt = null;
      }
    }

    return {
      ...reminder,
      nextScheduleAt,
    };
  });

  return withNextSchedule;
}

export async function getReminderById(params: { reminderId: string; userId: string }) {
  const reminder = await getReminderOwnedByUser(params);
  if (!reminder) throwDomainError("NOT_FOUND");
  return reminder;
}

export async function createReminder(params: {
  input: CreateReminderInput;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.input.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  return db.transaction(async (tx) => {
    let resolvedActivityTypeId: string | null = params.input.activityTypeId ?? null;
    if (!resolvedActivityTypeId && params.input.activityTypeSlug) {
      const type = await tx
        .select({ id: activityTypes.id })
        .from(activityTypes)
        .where(eq(activityTypes.slug, params.input.activityTypeSlug))
        .limit(1)
        .then((rows) => rows[0]);
      resolvedActivityTypeId = type?.id ?? null;
    }

    if (params.input.reminderMode === "activity" && !resolvedActivityTypeId) {
      throw new ReminderValidationError("Invalid reminder input", {
        activityTypeId: ["Activity type is required for activity reminders"],
      });
    }

    const tags = appendScheduleMetadataToTags({
      existingTags: null,
      labels: params.input.tags,
      scheduleMetadata: params.input.scheduleMetadata,
    });

    const [created] = await tx
      .insert(reminders)
      .values({
        babyId: params.input.babyId,
        activityTypeId: resolvedActivityTypeId,
        title: params.input.title ?? null,
        description: params.input.description ?? null,
        scheduleType: params.input.scheduleType,
        remindAt: params.input.remindAt,
        status: params.input.status,
        cronExpression:
          params.input.scheduleType === "recurring"
            ? params.input.cronExpression ?? null
            : null,
        repeatIntervalMinutes:
          params.input.scheduleType === "interval"
            ? params.input.repeatIntervalMinutes ?? null
            : null,
        adaptiveEnabled: params.input.adaptiveEnabled ?? false,
        allowSnooze: params.input.allowSnooze ?? true,
        maxSnoozes:
          params.input.allowSnooze === false
            ? null
            : params.input.maxSnoozes ?? null,
        priority: params.input.priority ?? 1,
        tags,
        createdBy: params.userId,
      })
      .returning();

    await logEvent({
      tx,
      reminderId: created.id,
      userId: params.userId,
      actionType: "created",
      previousValue: null,
      newValue: {
        event: "reminder.created",
        scheduleType: created.scheduleType,
        remindAt: created.remindAt,
        status: created.status,
      },
    });

    if (created.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder: created,
      });
    }

    return created;
  });
}

export async function updateReminder(params: {
  reminderId: string;
  userId: string;
  input: UpdateReminderInput;
}) {
  const existing = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });

  if (!existing) throwDomainError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const nextTags =
      params.input.tags === undefined && params.input.scheduleMetadata === undefined
        ? existing.tags
        : appendScheduleMetadataToTags({
          existingTags: existing.tags,
          labels: params.input.tags ?? null,
          scheduleMetadata: params.input.scheduleMetadata,
        });

    const nextScheduleType = params.input.scheduleType ?? existing.scheduleType;
    const nextCronExpression =
      nextScheduleType === "one-time"
        ? null
        : params.input.cronExpression === undefined
          ? existing.cronExpression
          : params.input.cronExpression;
    const nextRepeatInterval =
      nextScheduleType === "one-time" || nextScheduleType === "recurring"
        ? null
        : params.input.repeatIntervalMinutes === undefined
          ? existing.repeatIntervalMinutes
          : params.input.repeatIntervalMinutes;

    const nextScheduleMetadata =
      typeof nextTags === "object" && nextTags !== null
        ? (nextTags as Record<string, unknown>).scheduleMetadata
        : null;

    const recurringMutated =
      params.input.scheduleType === "recurring" ||
      params.input.cronExpression !== undefined ||
      params.input.scheduleMetadata !== undefined;
    const intervalMutated =
      params.input.scheduleType === "interval" ||
      params.input.repeatIntervalMinutes !== undefined;

    validateReminderScheduleInvariants({
      scheduleType: nextScheduleType,
      cronExpression: nextCronExpression,
      repeatIntervalMinutes: nextRepeatInterval,
      scheduleMetadata: nextScheduleMetadata,
      strictRecurring: recurringMutated,
      strictInterval: intervalMutated,
    });

    const [updated] = await tx
      .update(reminders)
      .set({
        title: params.input.title ?? existing.title,
        description: params.input.description ?? existing.description,
        remindAt: params.input.remindAt ?? existing.remindAt,
        scheduleType: nextScheduleType,
        status: params.input.status ?? existing.status,
        cronExpression: nextCronExpression,
        repeatIntervalMinutes: nextRepeatInterval,
        adaptiveEnabled: params.input.adaptiveEnabled ?? existing.adaptiveEnabled,
        allowSnooze: params.input.allowSnooze ?? existing.allowSnooze,
        maxSnoozes:
          params.input.allowSnooze === false
            ? null
            : params.input.maxSnoozes === undefined
              ? existing.maxSnoozes
              : params.input.maxSnoozes,
        priority: params.input.priority ?? existing.priority,
        tags: nextTags,
      })
      .where(eq(reminders.id, params.reminderId))
      .returning();

    await logEvent({
      tx,
      reminderId: updated.id,
      userId: params.userId,
      actionType: "rescheduled",
      previousValue: {
        remindAt: existing.remindAt,
        status: existing.status,
      },
      newValue: {
        event: "reminder.updated",
        remindAt: updated.remindAt,
        status: updated.status,
      },
    });

    const generationRelevantChanged =
      params.input.status !== undefined ||
      params.input.remindAt !== undefined ||
      params.input.scheduleType !== undefined ||
      params.input.cronExpression !== undefined ||
      params.input.repeatIntervalMinutes !== undefined;

    if (generationRelevantChanged) {
      await tx
        .delete(reminderOccurrences)
        .where(
          and(
            eq(reminderOccurrences.reminderId, updated.id),
            eq(reminderOccurrences.status, "pending"),
            gte(reminderOccurrences.scheduledFor, new Date())
          )
        );

      if (updated.status === "active") {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder: updated,
        });
      }
    }

    return updated;
  });
}

export async function pauseReminder(params: {
  reminderId: string;
  userId: string;
}) {
  return updateReminder({
    reminderId: params.reminderId,
    userId: params.userId,
    input: { status: "paused" },
  });
}

export async function resumeReminder(params: {
  reminderId: string;
  userId: string;
}) {
  return updateReminder({
    reminderId: params.reminderId,
    userId: params.userId,
    input: { status: "active" },
  });
}

async function findTargetOccurrence(params: {
  dbOrTx?: DbExecutor;
  reminderId: string;
  occurrenceId?: string;
  dueOnly?: boolean;
}) {
  const dbOrTx = params.dbOrTx ?? db;
  const now = new Date();

  if (params.occurrenceId) {
    return dbOrTx
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.id, params.occurrenceId),
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      )
      .limit(1)
      .then((rows) => rows[0]);
  }

  if (!params.dueOnly) {
    return dbOrTx
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      )
      .orderBy(asc(reminderOccurrences.scheduledFor))
      .limit(1)
      .then((rows) => rows[0]);
  }

  return dbOrTx
    .select()
    .from(reminderOccurrences)
    .where(
      and(
        eq(reminderOccurrences.reminderId, params.reminderId),
        eq(reminderOccurrences.status, "pending"),
        lte(reminderOccurrences.scheduledFor, now),
        or(
          sql`${reminderOccurrences.snoozeUntil} is null`,
          lte(reminderOccurrences.snoozeUntil, now)
        )
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function snoozeOccurrence(params: {
  reminderId: string;
  userId: string;
  minutes: number;
  occurrenceId?: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");
  if (reminder.allowSnooze === false) {
    throwDomainError("SNOOZE_DISABLED");
  }

  const occurrence = await findTargetOccurrence({
    reminderId: params.reminderId,
    occurrenceId: params.occurrenceId,
    dueOnly: false,
  });

  if (!occurrence) throwDomainError("NO_OCCURRENCE");
  if (
    reminder.maxSnoozes !== null &&
    reminder.maxSnoozes !== undefined &&
    (occurrence.snoozedCount ?? 0) >= reminder.maxSnoozes
  ) {
    throwDomainError("MAX_SNOOZE_REACHED");
  }

  const snoozeUntil = new Date(Date.now() + params.minutes * 60 * 1000);

  const [updated] = await db
    .update(reminderOccurrences)
    .set({
      snoozeUntil,
      snoozedCount: (occurrence.snoozedCount ?? 0) + 1,
    })
    .where(eq(reminderOccurrences.id, occurrence.id))
    .returning();

  await logEvent({
    tx: db,
    reminderId: params.reminderId,
    occurrenceId: occurrence.id,
    userId: params.userId,
    actionType: "snoozed",
    previousValue: {
      snoozeUntil: occurrence.snoozeUntil,
      snoozedCount: occurrence.snoozedCount ?? 0,
    },
    newValue: {
      event: "occurrence.snoozed",
      snoozeUntil,
      snoozedCount: updated.snoozedCount ?? 0,
    },
  });

  return {
    ...updated,
    babyId: reminder.babyId,
  };
}

export async function completeOccurrence(params: {
  reminderId: string;
  userId: string;
  occurrenceId?: string;
  linkedActivityId?: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const now = new Date();
    let occurrence = await findTargetOccurrence({
      dbOrTx: tx,
      reminderId: params.reminderId,
      occurrenceId: params.occurrenceId,
      dueOnly: true,
    });

    if (!occurrence && reminder.status === "active") {
      if (reminder.scheduleType === "one-time" && reminder.remindAt <= now) {
        const latestOccurrence = await tx
          .select({
            status: reminderOccurrences.status,
          })
          .from(reminderOccurrences)
          .where(eq(reminderOccurrences.reminderId, params.reminderId))
          .orderBy(desc(reminderOccurrences.scheduledFor))
          .limit(1)
          .then((rows) => rows[0]);

        if (latestOccurrence?.status === "completed") {
          throwDomainError("ALREADY_COMPLETED");
        }
        if (latestOccurrence?.status === "skipped") {
          throwDomainError("ALREADY_SKIPPED");
        }

        await tx
          .insert(reminderOccurrences)
          .values({
            reminderId: params.reminderId,
            scheduledFor: reminder.remindAt,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      } else if (
        (reminder.scheduleType === "recurring" ||
          reminder.scheduleType === "interval") &&
        reminder.remindAt <= now
      ) {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          lookbackHours: 48,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      occurrence = await findTargetOccurrence({
        dbOrTx: tx,
        reminderId: params.reminderId,
        occurrenceId: params.occurrenceId,
        dueOnly: true,
      });
    }

    if (!occurrence) {
      const latest = await tx
        .select({
          status: reminderOccurrences.status,
          snoozeUntil: reminderOccurrences.snoozeUntil,
        })
        .from(reminderOccurrences)
        .where(eq(reminderOccurrences.reminderId, params.reminderId))
        .orderBy(desc(reminderOccurrences.scheduledFor))
        .limit(1)
        .then((rows) => rows[0]);

      if (latest?.status === "completed") throwDomainError("ALREADY_COMPLETED");
      if (latest?.status === "skipped") throwDomainError("ALREADY_SKIPPED");
      if (
        latest?.status === "pending" &&
        latest.snoozeUntil &&
        latest.snoozeUntil > now
      ) {
        throwDomainError("SNOOZED_NOT_DUE");
      }
      throwDomainError("NO_DUE_OCCURRENCE");
    }

    let linkedActivityId: string | null = params.linkedActivityId ?? null;
    if (reminder.activityTypeId) {
      const [activity] = await tx
        .insert(activities)
        .values({
          babyId: reminder.babyId,
          activityTypeId: reminder.activityTypeId,
          startTime: now,
          createdBy: params.userId,
        })
        .returning({ id: activities.id });

      linkedActivityId = activity.id;
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        status: "completed",
        completedAt: now,
        linkedActivityId,
        triggeredAt: now,
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "completed",
      previousValue: { status: occurrence.status },
      newValue: {
        event: "occurrence.completed",
        status: "completed",
        linkedActivityId,
      },
    });

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ status: "cancelled" })
        .where(eq(reminders.id, reminder.id));

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: occurrence.id,
        userId: params.userId,
        actionType: "cancelled",
        previousValue: { status: reminder.status },
        newValue: { event: "reminder.cancelled", status: "cancelled" },
      });
    } else if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
    };
  });
}

export async function skipOccurrence(params: {
  reminderId: string;
  userId: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const now = new Date();
    let occurrence = await findTargetOccurrence({
      dbOrTx: tx,
      reminderId: params.reminderId,
      dueOnly: true,
    });

    if (!occurrence && reminder.status === "active") {
      if (reminder.scheduleType === "one-time" && reminder.remindAt <= now) {
        const latestOccurrence = await tx
          .select({
            status: reminderOccurrences.status,
          })
          .from(reminderOccurrences)
          .where(eq(reminderOccurrences.reminderId, params.reminderId))
          .orderBy(desc(reminderOccurrences.scheduledFor))
          .limit(1)
          .then((rows) => rows[0]);

        if (latestOccurrence?.status === "completed") {
          throwDomainError("ALREADY_COMPLETED");
        }
        if (latestOccurrence?.status === "skipped") {
          throwDomainError("ALREADY_SKIPPED");
        }

        await tx
          .insert(reminderOccurrences)
          .values({
            reminderId: params.reminderId,
            scheduledFor: reminder.remindAt,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      } else if (
        (reminder.scheduleType === "recurring" ||
          reminder.scheduleType === "interval") &&
        reminder.remindAt <= now
      ) {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          lookbackHours: 48,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      occurrence = await findTargetOccurrence({
        dbOrTx: tx,
        reminderId: params.reminderId,
        dueOnly: true,
      });
    }

    if (!occurrence) {
      const latest = await tx
        .select({
          status: reminderOccurrences.status,
          snoozeUntil: reminderOccurrences.snoozeUntil,
        })
        .from(reminderOccurrences)
        .where(eq(reminderOccurrences.reminderId, params.reminderId))
        .orderBy(desc(reminderOccurrences.scheduledFor))
        .limit(1)
        .then((rows) => rows[0]);

      if (latest?.status === "completed") throwDomainError("ALREADY_COMPLETED");
      if (latest?.status === "skipped") throwDomainError("ALREADY_SKIPPED");
      if (
        latest?.status === "pending" &&
        latest.snoozeUntil &&
        latest.snoozeUntil > now
      ) {
        throwDomainError("SNOOZED_NOT_DUE");
      }
      throwDomainError("NO_DUE_OCCURRENCE");
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        status: "skipped",
        completedAt: null,
        triggeredAt: new Date(),
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "skipped",
      previousValue: { status: occurrence.status },
      newValue: { event: "occurrence.skipped", status: "skipped" },
    });

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ status: "cancelled" })
        .where(eq(reminders.id, reminder.id));

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: occurrence.id,
        userId: params.userId,
        actionType: "cancelled",
        previousValue: { status: reminder.status },
        newValue: { event: "reminder.cancelled", status: "cancelled" },
      });
    } else if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
    };
  });
}

export async function rescheduleOccurrence(params: {
  reminderId: string;
  userId: string;
  remindAt: Date;
  occurrenceId?: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  const occurrence = await findTargetOccurrence({
    reminderId: params.reminderId,
    occurrenceId: params.occurrenceId,
    dueOnly: false,
  });

  return db.transaction(async (tx) => {
    if (!occurrence) {
      // Recovery path: create a fresh pending occurrence so manual reschedule
      // still works even when no pending occurrence exists.
      const [createdOccurrence] = await tx
        .insert(reminderOccurrences)
        .values({
          reminderId: params.reminderId,
          scheduledFor: params.remindAt,
          status: "pending",
        })
        .onConflictDoNothing({
          target: [
            reminderOccurrences.reminderId,
            reminderOccurrences.scheduledFor,
          ],
        })
        .returning();

      if (reminder.scheduleType === "one-time") {
        await tx
          .update(reminders)
          .set({ remindAt: params.remindAt })
          .where(eq(reminders.id, params.reminderId));
      }

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: createdOccurrence?.id ?? null,
        userId: params.userId,
        actionType: "rescheduled",
        previousValue: null,
        newValue: {
          event: "occurrence.rescheduled",
          scheduledFor: params.remindAt,
          source: "created_when_missing",
        },
      });

      const [latestPending] = await tx
        .select()
        .from(reminderOccurrences)
        .where(
          and(
            eq(reminderOccurrences.reminderId, params.reminderId),
            eq(reminderOccurrences.status, "pending"),
            eq(reminderOccurrences.scheduledFor, params.remindAt)
          )
        )
        .limit(1);

      if (!latestPending) throwDomainError("NO_OCCURRENCE");

      if (reminder.status === "active") {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      return {
        ...latestPending,
        babyId: reminder.babyId,
      };
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        scheduledFor: params.remindAt,
        status: "pending",
        snoozeUntil: null,
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ remindAt: params.remindAt })
        .where(eq(reminders.id, params.reminderId));
    }

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "rescheduled",
      previousValue: { scheduledFor: occurrence.scheduledFor },
      newValue: {
        event: "occurrence.rescheduled",
        scheduledFor: params.remindAt,
      },
    });

    if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
    };
  });
}

export async function cancelReminder(params: {
  reminderId: string;
  userId: string;
}) {
  const existing = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!existing) throwDomainError("NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(reminders)
      .set({ status: "cancelled" })
      .where(eq(reminders.id, params.reminderId));

    await tx
      .update(reminderOccurrences)
      .set({ status: "expired" })
      .where(
        and(
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      );

    await logEvent({
      tx,
      reminderId: params.reminderId,
      userId: params.userId,
      actionType: "cancelled",
      previousValue: { status: existing.status },
      newValue: { event: "reminder.cancelled", status: "cancelled" },
    });
  });
}

export async function getDueOccurrencesForBaby(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const now = new Date();

  return db
    .select({
      id: reminderOccurrences.id,
      reminderId: reminderOccurrences.reminderId,
      scheduledFor: reminderOccurrences.scheduledFor,
      snoozeUntil: reminderOccurrences.snoozeUntil,
      reminderTitle: reminders.title,
      scheduleType: reminders.scheduleType,
    })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .where(
      and(
        eq(reminders.babyId, params.babyId),
        eq(reminders.status, "active"),
        eq(reminderOccurrences.status, "pending"),
        lte(reminderOccurrences.scheduledFor, now),
        or(
          sql`${reminderOccurrences.snoozeUntil} is null`,
          lte(reminderOccurrences.snoozeUntil, now)
        )
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor));
}

export async function getNotificationsForBaby(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const isMissingColumnError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703";

  let notifications: Array<{
    id: string;
    reminderId: string;
    occurrenceId: string | null;
    activityTypeId: string | null;
    reminderStatus: "active" | "paused" | "cancelled" | null;
    scheduleType: "one-time" | "recurring" | "interval" | null;
    currentState: ReminderCurrentState | null;
    hasDueOccurrence: boolean;
    dueOccurrenceCount: number;
    title: string | null;
    scheduledFor: Date | null;
    status: string | null;
    readAt: Date | null;
    createdAt: Date;
    actionUrl: string | null;
    severity: string | null;
    errorMessage: string | null;
    attempts: number | null;
  }> = [];
  let unreadCount = 0;

  try {
    notifications = await db
      .selectDistinctOn(
        [notificationLogs.reminderId, notificationLogs.occurrenceId],
        {
          id: notificationLogs.id,
          reminderId: notificationLogs.reminderId,
          occurrenceId: notificationLogs.occurrenceId,
          activityTypeId: reminders.activityTypeId,
          reminderStatus: reminders.status,
          scheduleType: reminders.scheduleType,
          currentState: sql<ReminderCurrentState>`(
            case
              when ${reminders.status} = 'cancelled' then 'cancelled'
              when exists (
                select 1
                from reminder_occurrences ro
                where ro.reminder_id = ${reminders.id}
                  and ro.status = 'pending'
                  and ro.scheduled_for <= now()
                  and (
                    ro.snooze_until is null
                    or ro.snooze_until <= now()
                  )
              ) then 'overdue'
              when exists (
                select 1
                from reminder_occurrences ro
                where ro.reminder_id = ${reminders.id}
                  and ro.status = 'pending'
                  and ro.snooze_until > now()
              ) then 'snoozed'
              when ${reminders.scheduleType} = 'one-time'
                and (
                  select ro.status
                  from reminder_occurrences ro
                  where ro.reminder_id = ${reminders.id}
                    and ro.status in ('completed', 'skipped')
                  order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
                  limit 1
                ) = 'completed' then 'completed'
              when ${reminders.scheduleType} = 'one-time'
                and (
                  select ro.status
                  from reminder_occurrences ro
                  where ro.reminder_id = ${reminders.id}
                    and ro.status in ('completed', 'skipped')
                  order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
                  limit 1
                ) = 'skipped' then 'skipped'
              when ${reminders.scheduleType} in ('recurring', 'interval')
                and (
                  select ro.status
                  from reminder_occurrences ro
                  where ro.reminder_id = ${reminders.id}
                    and ro.status in ('completed', 'skipped')
                  order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
                  limit 1
                ) = 'completed' then 'last_completed'
              when ${reminders.scheduleType} in ('recurring', 'interval')
                and (
                  select ro.status
                  from reminder_occurrences ro
                  where ro.reminder_id = ${reminders.id}
                    and ro.status in ('completed', 'skipped')
                  order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
                  limit 1
                ) = 'skipped' then 'last_skipped'
              else 'upcoming'
            end
          )`,
          hasDueOccurrence: sql<boolean>`(
            exists(
              select 1
              from reminder_occurrences ro
              where ro.reminder_id = ${reminders.id}
                and ro.status = 'pending'
                and ro.scheduled_for <= now()
                and (
                  ro.snooze_until is null
                  or ro.snooze_until <= now()
                )
            ) or (
              ${reminders.scheduleType} = 'one-time'
              and ${reminders.status} = 'active'
              and ${reminders.remindAt} <= now()
              and not exists (
                select 1
                from reminder_occurrences ro_any
                where ro_any.reminder_id = ${reminders.id}
              )
            )
          )`,
          dueOccurrenceCount: sql<number>`(
            select count(*)
            from reminder_occurrences ro
            where ro.reminder_id = ${reminders.id}
              and ro.status = 'pending'
              and ro.scheduled_for <= now()
              and (
                ro.snooze_until is null
                or ro.snooze_until <= now()
              )
          )`,
          title: notificationLogs.title,
          scheduledFor: notificationLogs.scheduledFor,
          status: notificationLogs.status,
          readAt: notificationLogs.readAt,
          createdAt: notificationLogs.sentAt,
          actionUrl: notificationLogs.actionUrl,
          severity: notificationLogs.severity,
          errorMessage: notificationLogs.errorMessage,
          attempts: notificationLogs.attempts,
        }
      )
      .from(notificationLogs)
      .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
      .where(eq(reminders.babyId, params.babyId))
      .orderBy(
        notificationLogs.reminderId,
        notificationLogs.occurrenceId,
        desc(notificationLogs.sentAt)
      );

    notifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    unreadCount = notifications.filter((n) => !n.readAt).length;
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    // Backward-compatible fallback until notification schema migration is applied.
    const legacy = await db
      .select({
        id: notificationLogs.id,
        reminderId: notificationLogs.reminderId,
        status: notificationLogs.status,
        errorMessage: notificationLogs.errorMessage,
        createdAt: notificationLogs.sentAt,
      })
      .from(notificationLogs)
      .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
      .where(eq(reminders.babyId, params.babyId))
      .orderBy(desc(notificationLogs.sentAt));

    notifications = legacy.map((n) => ({
      id: n.id,
      reminderId: n.reminderId,
      occurrenceId: null,
      activityTypeId: null,
      reminderStatus: "active",
      scheduleType: null,
      currentState: null,
      hasDueOccurrence: false,
      dueOccurrenceCount: 0,
      title: "Reminder notification",
      scheduledFor: null,
      status: n.status ?? "queued",
      readAt: null,
      createdAt: n.createdAt,
      actionUrl: null,
      severity: "info",
      errorMessage: n.errorMessage,
      attempts: 0,
    }));

    unreadCount = notifications.filter((n) => !n.readAt).length;
  }

  return {
    notifications,
    unreadCount,
  };
}

export async function markNotificationRead(params: {
  notificationId: string;
  userId: string;
}) {
  const notification = await db
    .select({
      id: notificationLogs.id,
      reminderId: notificationLogs.reminderId,
      readAt: notificationLogs.readAt,
      reminderBabyId: reminders.babyId,
    })
    .from(notificationLogs)
    .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
    .where(eq(notificationLogs.id, params.notificationId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!notification) throwDomainError("NOT_FOUND");

  const owned = await assertBabyOwnership({
    babyId: notification.reminderBabyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const [updated] = await db
    .update(notificationLogs)
    .set({ readAt: notification.readAt ?? new Date() })
    .where(eq(notificationLogs.id, params.notificationId))
    .returning();

  return updated;
}

export async function markAllNotificationsRead(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  await db
    .update(notificationLogs)
    .set({ readAt: new Date() })
    .where(
      and(
        sql`${notificationLogs.reminderId} in (
          select ${reminders.id}
          from ${reminders}
          where ${reminders.babyId} = ${params.babyId}
        )`,
        sql`${notificationLogs.readAt} is null`
      )
    );
}

export async function cleanupOldReadNotifications(params: {
  babyId: string;
  userId: string;
  olderThanDays: number;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const safeDays = Math.max(1, Math.min(params.olderThanDays, 3650));
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  return db
    .delete(notificationLogs)
    .where(
      and(
        sql`${notificationLogs.reminderId} in (
          select ${reminders.id}
          from ${reminders}
          where ${reminders.babyId} = ${params.babyId}
        )`,
        sql`${notificationLogs.readAt} is not null`,
        lte(notificationLogs.readAt, cutoff)
      )
    )
    .returning({ id: notificationLogs.id });
}

export async function markOccurrenceAsDue(params: {
  occurrenceId: string;
  reminderId: string;
  userId?: string | null;
}) {
  return db.transaction(async (tx) => {
    const [occurrence] = await tx
      .update(reminderOccurrences)
      .set({ triggeredAt: new Date() })
      .where(
        and(
          eq(reminderOccurrences.id, params.occurrenceId),
          sql`${reminderOccurrences.triggeredAt} is null`
        )
      )
      .returning();

    if (!occurrence) {
      return null;
    }

    const [reminderForNotif] = await tx
      .select({
        id: reminders.id,
        title: reminders.title,
        babyId: reminders.babyId,
      })
      .from(reminders)
      .where(eq(reminders.id, params.reminderId))
      .limit(1);

    const isMissingColumnError = (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "42703";

    let notification: { id: string } | undefined;
    try {
      [notification] = await tx
        .insert(notificationLogs)
        .values({
          reminderId: params.reminderId,
          occurrenceId: params.occurrenceId,
          userId: params.userId ?? null,
          title: reminderForNotif?.title ?? "Reminder due",
          scheduledFor: occurrence.scheduledFor,
          actionUrl: reminderForNotif
            ? `/dashboard/${reminderForNotif.babyId}/reminders/${params.reminderId}`
            : null,
          severity: "warning",
          readAt: null,
          status: "queued",
          attempts: 0,
          errorMessage: null,
        })
        .returning({ id: notificationLogs.id });
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;

      // Backward-compatible path for databases where new inbox columns
      // are not migrated yet.
      [notification] = await tx
        .insert(notificationLogs)
        .values({
          reminderId: params.reminderId,
          userId: params.userId ?? null,
          status: "queued",
          errorMessage: null,
        })
        .returning({ id: notificationLogs.id });
    }

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: params.occurrenceId,
      userId: params.userId ?? null,
      actionType: "created",
      previousValue: { triggeredAt: null },
      newValue: { event: "occurrence.due", triggeredAt: occurrence.triggeredAt },
    });

    return {
      ...occurrence,
      notificationId: notification?.id ?? null,
    };
  });
}

export async function updateNotificationStatus(params: {
  notificationId: string;
  status: NotificationStatus;
  errorMessage?: string | null;
}) {
  const maxRetries = 3;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.id, params.notificationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      throwDomainError("NOTIFICATION_NOT_FOUND");
    }

    let nextAttempts = existing.attempts ?? 0;
    let nextStatus: NotificationStatus = params.status;

    if (params.status === "retrying" || params.status === "failed") {
      nextAttempts += 1;
      if (nextAttempts >= maxRetries) {
        nextStatus = "permanently_failed";
      }
    }

    const [updated] = await tx
      .update(notificationLogs)
      .set({
        status: nextStatus,
        attempts: nextAttempts,
        errorMessage: params.errorMessage ?? null,
        sentAt:
          nextStatus === "sent" ? new Date() : existing.sentAt,
      })
      .where(eq(notificationLogs.id, params.notificationId))
      .returning();

    await tx.insert(reminderActionLogs).values({
      reminderId: existing.reminderId,
      occurrenceId: existing.occurrenceId ?? null,
      userId: existing.userId ?? null,
      actionType: "created",
      previousValue: {
        event: "notification.lifecycle",
        status: existing.status,
        attempts: existing.attempts,
      },
      newValue: {
        event: "notification.lifecycle",
        status: nextStatus,
        attempts: nextAttempts,
        errorMessage: params.errorMessage ?? null,
      },
    });

    return updated;
  });
}
