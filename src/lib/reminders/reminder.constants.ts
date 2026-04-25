//reminderStatuses.constants
export const scheduleTypes = [
  "one-time",
  "recurring",
  "interval",
] as const;

export const reminderStatuses = [
  "active",
  "paused",
  "cancelled",
] as const;

/**
 * Hours after the effective due moment with no complete/skip before a pending
 * occurrence is marked `expired`. Effective moment = `triggered_at` if set,
 * otherwise `scheduled_for`. See `expireOldOccurrences`.
 */
export const EXPIRATION_HOURS = 12;