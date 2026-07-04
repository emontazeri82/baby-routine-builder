// reminders/reminder.types
import { 
  scheduleTypes, reminderStatuses } from "./reminder.constants";
export type ReminderStatus = (typeof reminderStatuses)[number];

export type ReminderCurrentState =
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "completed"
  | "skipped"
  | "last_completed"
  | "last_skipped"
  | "upcoming";

export type NotificationStatus =
  | "queued"
  | "sent"
  | "failed"
  | "retrying"
  | "permanently_failed";

export type StoredScheduleMetadata = {
  type?: "daily" | "weekly" | "custom" | "interval";
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
};
export type ReminderDTO = {
  id: string;
  babyId: string;
  activityTypeId: string | null;

  title: string | null;
  description: string | null;

  scheduleType: (typeof scheduleTypes)[number];
  status: ReminderStatus;

  remindAt: Date | string;
  cronExpression: string | null;
  repeatIntervalMinutes: number | null;

  currentState: ReminderCurrentState;

  nextUpcomingAt: Date | string | null;
  nextScheduleAt: Date | string | null;
  dueScheduledFor: Date | string | null;

  overdueCount: number;
  hasDueOccurrence: boolean;

  occurrenceId?: string | null;
  
  pendingOccurrences: number;
  completedOccurrences: number;
  skippedOccurrences: number;
  expiredOccurrences: number;

  lastResolvedStatus: "completed" | "skipped" | null;
  lastResolvedAt: Date | string | null;
  lastCompletedAt: Date | string | null;
  lastScheduledFor: Date | string | null;

  snoozedUntil: Date | string | null;

  allowSnooze: boolean | null;
  adaptiveEnabled: boolean | null;
  priority: number | null;

  tags: Record<string, unknown> | null;

  createdAt: Date | string;
};
export type ListRemindersParams = {
  babyId: string;
  userId: string;
  status: ReminderStatus | "all";
};