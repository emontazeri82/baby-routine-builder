export const CLEANUP_DEFAULTS = {
  reminderOccurrenceRetentionDays: 90,
  notificationLogRetentionDays: 90,
  reminderActionLogRetentionDays: 180,
} as const;

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCleanupConfig() {
  return {
    reminderOccurrenceRetentionDays: readPositiveIntegerEnv(
      "REMINDER_OCCURRENCE_RETENTION_DAYS",
      CLEANUP_DEFAULTS.reminderOccurrenceRetentionDays
    ),
    notificationLogRetentionDays: readPositiveIntegerEnv(
      "NOTIFICATION_LOG_RETENTION_DAYS",
      CLEANUP_DEFAULTS.notificationLogRetentionDays
    ),
    reminderActionLogRetentionDays: readPositiveIntegerEnv(
      "REMINDER_ACTION_LOG_RETENTION_DAYS",
      CLEANUP_DEFAULTS.reminderActionLogRetentionDays
    ),
  };
}
