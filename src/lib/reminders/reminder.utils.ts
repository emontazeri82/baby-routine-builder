// reminders/reminder.utils
// ZOD (for scheduleMetadata typing)
// =========================
import { z } from "zod";

// =========================
// SCHEMA (must exist somewhere)
// =========================
import { scheduleMetadataSchema } from "./reminder.validation";

// =========================
// TYPES
// =========================
import type { StoredScheduleMetadata } from "./reminder.types";
import { scheduleTypes } from "./reminder.constants";

// =========================
// ERRORS
// =========================
import { ReminderValidationError } from "./reminder.errors";

export function appendScheduleMetadataToTags(params: {
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
export function getStoredScheduleMetadata(tags: unknown) {
  if (!tags || typeof tags !== "object") return null;
  const raw = (tags as Record<string, unknown>).scheduleMetadata;
  if (!raw || typeof raw !== "object") return null;
  return raw as StoredScheduleMetadata;
}

export function fallbackDailyCronFromRemindAt(remindAt: Date) {
  return `${remindAt.getMinutes()} ${remindAt.getHours()} * * *`;
}

export function resolveRecurringCronExpressionFromReminder(reminder: {
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
export function validateReminderScheduleInvariants(params: {
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
