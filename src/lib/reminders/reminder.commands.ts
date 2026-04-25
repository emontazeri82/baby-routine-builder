import { db } from "@/lib/db";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { EXPIRATION_HOURS } from "./reminder.constants";

import {
  activityTypes,
  reminderOccurrences,
  reminderActionLogs,
  reminders,
} from "@/lib/db/schema";
import { generateOccurrencesForReminder } from "@/lib/reminderEngine/generateOccurrences";

import { ReminderValidationError, throwDomainError } from "./reminder.errors";
import {
  assertBabyOwnership,
  getReminderOwnedByUser,
} from "./reminder.queries";
import {
  appendScheduleMetadataToTags,
  validateReminderScheduleInvariants,
} from "./reminder.utils";
import type {
  CreateReminderInput,
  UpdateReminderInput,
} from "./reminder.validation";

type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export async function logEvent(params: {
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

/**
 * Marks stale pending occurrences as `expired`.
 * - Uses DB `now()` so cutoff matches all SQL that uses `now()` in reads/dispatch.
 * - Baseline is `coalesce(triggered_at, scheduled_for)` so a late dispatch still
 *   gives a full window after the reminder actually fired.
 * - Does not expire while `snooze_until` is still in the future.
 */
export async function expireOldOccurrences() {
  const hours = EXPIRATION_HOURS;

  await db
    .update(reminderOccurrences)
    .set({ status: "expired" })
    .where(
      and(
        eq(reminderOccurrences.status, "pending"),
        or(
          isNull(reminderOccurrences.snoozeUntil),
          lte(reminderOccurrences.snoozeUntil, sql`now()`)
        ),
        sql`coalesce(${reminderOccurrences.triggeredAt}, ${reminderOccurrences.scheduledFor}) <= now() - (${hours} * interval '1 hour')`
      )
    );
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
