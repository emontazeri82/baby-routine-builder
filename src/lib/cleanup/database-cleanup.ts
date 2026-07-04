import { getCleanupConfig } from "./config";
import { cleanupNotificationLogs } from "./tasks/notification-logs";
import { cleanupReminderActionLogs } from "./tasks/reminder-action-logs";
import { cleanupReminderOccurrences } from "./tasks/reminder-occurrences";

type CleanupTaskName =
  | "reminderOccurrences"
  | "notificationLogs"
  | "reminderActionLogs";

export type CleanupTaskResult = {
  deleted: number;
  error: string | null;
};

export type DatabaseCleanupResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  retentionDays: {
    reminderOccurrences: number;
    notificationLogs: number;
    reminderActionLogs: number;
  };
  results: Record<CleanupTaskName, CleanupTaskResult>;
};

async function runCleanupTask(
  task: () => Promise<number>
): Promise<CleanupTaskResult> {
  try {
    return {
      deleted: await task(),
      error: null,
    };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown cleanup error",
    };
  }
}

export async function cleanupDatabase(): Promise<DatabaseCleanupResult> {
  const startedAt = new Date();
  const config = getCleanupConfig();

  const results: DatabaseCleanupResult["results"] = {
    reminderOccurrences: await runCleanupTask(() =>
      cleanupReminderOccurrences(config.reminderOccurrenceRetentionDays)
    ),
    notificationLogs: await runCleanupTask(() =>
      cleanupNotificationLogs(config.notificationLogRetentionDays)
    ),
    reminderActionLogs: await runCleanupTask(() =>
      cleanupReminderActionLogs(config.reminderActionLogRetentionDays)
    ),
  };

  const summary: DatabaseCleanupResult = {
    ok: Object.values(results).every((result) => result.error === null),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    retentionDays: {
      reminderOccurrences: config.reminderOccurrenceRetentionDays,
      notificationLogs: config.notificationLogRetentionDays,
      reminderActionLogs: config.reminderActionLogRetentionDays,
    },
    results,
  };

  console.log("[database-cleanup]", summary);

  return summary;
}
