import { and, asc, count, eq, gte } from "drizzle-orm";
import { CronExpressionParser } from "cron-parser";

import { db } from "@/lib/db";
import {
  babies,
  reminderActionLogs,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";

type DbExecutor = Pick<typeof db, "select" | "insert">;

type ReminderRow = typeof reminders.$inferSelect & {
  scheduleType: "one-time" | "recurring" | "interval";
  status: "active" | "paused" | "cancelled";
};

type GenerateOptions = {
  dbOrTx?: DbExecutor;
  reminder: ReminderRow;
  horizonDays?: number;
  lookbackHours?: number;
  maxOccurrences?: number;
};

function isActive(reminder: ReminderRow) {
  return reminder.status === "active";
}

type StoredScheduleMetadata = {
  type?: "daily" | "weekly" | "custom" | "interval";
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
};

function getStoredScheduleMetadata(reminder: ReminderRow) {
  const tags = reminder.tags;
  if (!tags || typeof tags !== "object") return null;
  const record = tags as Record<string, unknown>;
  const raw = record.scheduleMetadata;
  if (raw && typeof raw === "object") {
    return raw as StoredScheduleMetadata;
  }

  // Backward compatibility: older reminders stored schedule metadata directly in tags.
  if (
    typeof record.type === "string" &&
    typeof record.hour === "number" &&
    typeof record.minute === "number"
  ) {
    return {
      type: record.type as StoredScheduleMetadata["type"],
      hour: record.hour,
      minute: record.minute,
      daysOfWeek: Array.isArray(record.daysOfWeek)
        ? (record.daysOfWeek as number[])
        : undefined,
    };
  }

  return null;
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedFormatter(timezone: string) {
  const existing = zonedFormatters.get(timezone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  zonedFormatters.set(timezone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timezone: string) {
  const parts = getZonedFormatter(timezone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function zonedWallTimeToUtc(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: string;
}) {
  const { year, month, day, hour, minute, timezone } = params;
  const targetMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utcMs = targetMs;

  // Iteratively adjust offset to land on the requested wall-clock time in the zone.
  for (let i = 0; i < 4; i++) {
    const observed = getZonedParts(new Date(utcMs), timezone);
    const observedMs = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      0,
      0
    );
    const delta = targetMs - observedMs;
    if (delta === 0) break;
    utcMs += delta;
  }

  return new Date(utcMs);
}

function generateDailyCandidates(params: {
  windowStart: Date;
  effectiveEnd: Date;
  timezone: string;
  hour: number;
  minute: number;
  targetCount: number;
}) {
  const { windowStart, effectiveEnd, timezone, hour, minute, targetCount } = params;
  const startLocal = getZonedParts(windowStart, timezone);
  const endLocal = getZonedParts(effectiveEnd, timezone);
  const cursor = new Date(
    Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day)
  );
  const endDayMs = Date.UTC(endLocal.year, endLocal.month - 1, endLocal.day);
  const out: Date[] = [];

  while (cursor.getTime() <= endDayMs && out.length < targetCount) {
    const scheduledFor = zonedWallTimeToUtc({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
      hour,
      minute,
      timezone,
    });

    if (scheduledFor >= windowStart && scheduledFor <= effectiveEnd) {
      out.push(scheduledFor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

function fallbackDailyCronFromRemindAt(reminder: ReminderRow) {
  const d = new Date(reminder.remindAt);
  return `${d.getMinutes()} ${d.getHours()} * * *`;
}

function resolveRecurringCronExpression(reminder: ReminderRow) {
  if (reminder.cronExpression?.trim()) return reminder.cronExpression.trim();

  const meta = getStoredScheduleMetadata(reminder);
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

    if (meta.type === "weekly") {
      return `${m} ${h} * * 1-5`;
    }
    if (meta.type === "custom") {
      const days = (meta.daysOfWeek ?? [])
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .join(",");
      if (days) return `${m} ${h} * * ${days}`;
    }
    return `${m} ${h} * * *`;
  }

  return fallbackDailyCronFromRemindAt(reminder);
}

async function existingTotalCount(dbOrTx: DbExecutor, reminderId: string) {
  const rows = await dbOrTx
    .select({ count: count() })
    .from(reminderOccurrences)
    .where(eq(reminderOccurrences.reminderId, reminderId));

  return Number(rows[0]?.count ?? 0);
}

async function getReminderTimezone(
  dbOrTx: DbExecutor,
  babyId: string
) {
  const row = await dbOrTx
    .select({ timezone: babies.timezone })
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1)
    .then((rows) => rows[0]);

  return row?.timezone ?? "UTC";
}

export async function generateOccurrencesForReminder(options: GenerateOptions) {
  const {
    reminder,
    horizonDays = 7,
    lookbackHours = 48,
    maxOccurrences = 30,
  } = options;
  console.log("GENERATING OCCURRENCES", {
    reminderId: reminder.id,
    scheduleType: reminder.scheduleType,
    remindAt: reminder.remindAt,
  });
  const dbOrTx = options.dbOrTx ?? db;

  if (!isActive(reminder)) {
    return { inserted: 0, generatedAt: new Date() };
  }

  const now = new Date();
  const windowStart = new Date(
    Math.max(reminder.remindAt.getTime(), now.getTime() - lookbackHours * 3600000)
  );
  const timezone = await getReminderTimezone(dbOrTx, reminder.babyId);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + horizonDays);

  const endAt = reminder.endAt ?? null;
  const effectiveEnd =
    endAt && endAt < horizon
      ? endAt
      : horizon;

  if (reminder.scheduleType === "one-time") {
    const inserted = await dbOrTx
      .insert(reminderOccurrences)
      .values({
        reminderId: reminder.id,
        scheduledFor: reminder.remindAt,
        status: "pending",
      })
      .onConflictDoNothing({
        target: [
          reminderOccurrences.reminderId,
          reminderOccurrences.scheduledFor,
        ],
      })
      .returning({ id: reminderOccurrences.id });

    return { inserted: inserted.length, generatedAt: new Date() };
  }

  const alreadyCreated = await existingTotalCount(dbOrTx, reminder.id);
  const capByEndAfter =
    reminder.endAfterOccurrences && reminder.endAfterOccurrences > 0
      ? Math.max(0, reminder.endAfterOccurrences - alreadyCreated)
      : maxOccurrences;

  const targetCount = Math.min(maxOccurrences, capByEndAfter);
  const scheduleType = reminder.scheduleType ?? "one-time";

  const canSelfHeal =
    reminder.status === "active" &&
    (scheduleType as string) !== "one-time" &&
    !(
      reminder.endAfterOccurrences &&
      reminder.endAfterOccurrences > 0 &&
      alreadyCreated >= reminder.endAfterOccurrences
    );



  const ensureFuturePending = async () => {
    if (!canSelfHeal) return;

    const futurePending = await dbOrTx
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, reminder.id),
          eq(reminderOccurrences.status, "pending"),
          gte(reminderOccurrences.scheduledFor, now)
        )
      )
      .limit(1);

    if (futurePending.length > 0) return;

    if (reminder.scheduleType === "recurring") {
      const cronExpression = resolveRecurringCronExpression(reminder);

      console.log("CRON DEBUG", {
        reminderId: reminder.id,
        cronExpression,
        timezone,
        now,
        remindAt: reminder.remindAt,
      });
      let nextDate: Date | null = null;

      try {
        const iter = CronExpressionParser.parse(cronExpression, {
          currentDate: now,
          tz: timezone,
        });
        nextDate = iter.next().toDate();
      } catch {
        console.error("Cron parse failed for reminder", reminder.id);
        return;
      }

      if (nextDate && (!reminder.endAt || nextDate <= reminder.endAt)) {
        await dbOrTx
          .insert(reminderOccurrences)
          .values({
            reminderId: reminder.id,
            scheduledFor: nextDate,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      }
      return;
    }

    if (reminder.scheduleType === "interval" && reminder.repeatIntervalMinutes) {
      const nextDate = new Date(
        now.getTime() + reminder.repeatIntervalMinutes * 60 * 1000
      );
      if (!reminder.endAt || nextDate <= reminder.endAt) {
        await dbOrTx
          .insert(reminderOccurrences)
          .values({
            reminderId: reminder.id,
            scheduledFor: nextDate,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      }
    }
  };

  if (targetCount <= 0) {
    await ensureFuturePending();
    return { inserted: 0, generatedAt: new Date() };
  }

  const candidates: Date[] = [];

  if ((reminder.scheduleType as string) === "one-time") {
    candidates.push(new Date(reminder.remindAt));
  }

  if (reminder.scheduleType === "recurring") {
    const recurringStart = new Date(
      Math.max(now.getTime(), reminder.remindAt.getTime())
    );

    const metadata = getStoredScheduleMetadata(reminder);
    const hasDailyMetadata =
      metadata?.type === "daily" &&
      Number.isInteger(metadata.hour) &&
      Number.isInteger(metadata.minute) &&
      metadata.hour! >= 0 &&
      metadata.hour! <= 23 &&
      metadata.minute! >= 0 &&
      metadata.minute! <= 59;

    if (hasDailyMetadata) {
      candidates.push(
        ...generateDailyCandidates({
          windowStart: recurringStart,
          effectiveEnd,
          timezone,
          hour: metadata!.hour!,
          minute: metadata!.minute!,
          targetCount,
        })
      );
    } else {
      const cronExpression = resolveRecurringCronExpression(reminder);
      const cursor = new Date(recurringStart.getTime() - 1000);

      let iter: ReturnType<typeof CronExpressionParser.parse>;
      try {
        iter = CronExpressionParser.parse(cronExpression, {
          currentDate: cursor,
          tz: timezone,
        });
      } catch {
        console.error("Invalid cron expression:", cronExpression);
        return { inserted: 0, generatedAt: new Date() };
      }

      while (candidates.length < targetCount) {
        const next = new Date(iter.next().toDate().toISOString());
       console.log("NEXT OCCURRENCE", next);
       
        if (next > effectiveEnd) break;
        if (next < recurringStart) continue;
        candidates.push(next);
      }
    }
  }

  if (reminder.scheduleType === "interval" && reminder.repeatIntervalMinutes) {
    const intervalMs = reminder.repeatIntervalMinutes * 60 * 1000;
    const anchorMs = reminder.remindAt.getTime();
    const startMs = windowStart.getTime();
    const firstMs =
      startMs <= anchorMs
        ? anchorMs
        : anchorMs + Math.ceil((startMs - anchorMs) / intervalMs) * intervalMs;

    let next = new Date(firstMs);
    while (next <= effectiveEnd && candidates.length < targetCount) {
      candidates.push(new Date(next));
      next = new Date(next.getTime() + intervalMs);
    }
  }

  if (candidates.length === 0) {
    try {
      const cronExpression = resolveRecurringCronExpression(reminder);

      const iter = CronExpressionParser.parse(cronExpression, {
        currentDate: now,
        tz: timezone,
      });

      const next = iter.next().toDate();

      if (!reminder.endAt || next <= reminder.endAt) {
        candidates.push(next);
      }
    } catch (err) {
      console.error("Failed fallback cron generation", err);
    }
  }

  // De-duplicate in-memory first, then rely on unique index in DB for race safety.
  const uniq = Array.from(new Set(candidates.map((d) => d.toISOString()))).map(
    (iso) => new Date(iso)
  );

  const inserted = await dbOrTx
    .insert(reminderOccurrences)
    .values(
      uniq.map((scheduledFor) => ({
        reminderId: reminder.id,
        scheduledFor,
        status: "pending" as const,
      }))
    )
    .onConflictDoNothing({
      target: [reminderOccurrences.reminderId, reminderOccurrences.scheduledFor],
    })
    .returning({
      id: reminderOccurrences.id,
      scheduledFor: reminderOccurrences.scheduledFor,
    });

  if (inserted.length > 0) {
    await dbOrTx.insert(reminderActionLogs).values(
      inserted.map((row) => ({
        reminderId: reminder.id,
        occurrenceId: row.id,
        userId: reminder.createdBy ?? null,
        actionType: "created" as const,
        previousValue: null,
        newValue: {
          event: "occurrence.generated",
          scheduledFor: row.scheduledFor,
          scheduleType: reminder.scheduleType,
        },
      }))
    );
  }

  await ensureFuturePending();

  if (process.env.NODE_ENV !== "production") {
    console.log("Reminder generation result:", {
      reminderId: reminder.id,
      inserted: inserted.length,
    });
  }

  return {
    inserted: inserted.length,
    generatedAt: new Date(),
  };
}

export async function generateOccurrencesForActiveReminders(params: {
  babyId?: string;
  horizonDays?: number;
  maxOccurrences?: number;
}) {
  const whereClause = params.babyId
    ? and(eq(reminders.status, "active"), eq(reminders.babyId, params.babyId))
    : eq(reminders.status, "active");

  const active = await db
    .select()
    .from(reminders)
    .where(whereClause)
    .orderBy(asc(reminders.createdAt));

  let totalInserted = 0;
  for (const reminder of active) {
    const result = await generateOccurrencesForReminder({
      reminder,
      horizonDays: params.horizonDays,
      maxOccurrences: params.maxOccurrences,
    });
    totalInserted += result.inserted;
  }

  return { remindersProcessed: active.length, inserted: totalInserted };
}
