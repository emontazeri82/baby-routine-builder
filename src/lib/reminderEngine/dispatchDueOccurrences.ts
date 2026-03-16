import { and, asc, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notificationLogs, reminderOccurrences, reminders } from "@/lib/db/schema";
import {
  markOccurrenceAsDue,
  updateNotificationStatus,
} from "@/lib/reminderService";

type DispatchSummary = {
  processedCount: number;
  skippedCount: number;
};

export async function dispatchDueOccurrences(params?: {
  babyId?: string;
}): Promise<DispatchSummary> {
  const now = new Date();

  const baseWhere = and(
    eq(reminders.status, "active"),
    eq(reminderOccurrences.status, "pending"),
    lte(reminderOccurrences.scheduledFor, now),
    or(
      sql`${reminderOccurrences.snoozeUntil} is null`,
      lte(reminderOccurrences.snoozeUntil, now)
    ),
    sql`${reminderOccurrences.triggeredAt} is null`,
    params?.babyId ? eq(reminders.babyId, params.babyId) : sql`true`
  );

  const due = await db
    .select({
      occurrenceId: reminderOccurrences.id,
      reminderId: reminderOccurrences.reminderId,
      userId: reminders.createdBy,
    })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .where(baseWhere)
    .orderBy(asc(reminderOccurrences.scheduledFor));

  let processedCount = 0;
  let skippedCount = 0;

  for (const item of due) {
    const marked = await markOccurrenceAsDue({
      occurrenceId: item.occurrenceId,
      reminderId: item.reminderId,
      userId: item.userId,
    });

    if (marked) {
      if (marked.notificationId) {
        await processNotificationDelivery({
          notificationId: marked.notificationId,
        });
      }
      processedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  return { processedCount, skippedCount };
}

export async function processNotificationDelivery(params: {
  notificationId: string;
}) {
  const existing = await db
    .select({
      id: notificationLogs.id,
      status: notificationLogs.status,
    })
    .from(notificationLogs)
    .where(eq(notificationLogs.id, params.notificationId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!existing) return null;
  if (
    existing.status !== "queued" &&
    existing.status !== "retrying" &&
    existing.status !== "failed"
  ) {
    return existing;
  }

  try {
    // Placeholder transport integration point.
    await updateNotificationStatus({
      notificationId: params.notificationId,
      status: "sent",
    });
  } catch (error) {
    await updateNotificationStatus({
      notificationId: params.notificationId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "send_failed",
    });
  }

  return db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.id, params.notificationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function processFailedNotifications(params?: {
  maxBatch?: number;
}) {
  const maxBatch = params?.maxBatch ?? 100;
  const retryCandidates = await db
    .select({
      id: notificationLogs.id,
      attempts: notificationLogs.attempts,
    })
    .from(notificationLogs)
    .where(
      and(
        or(
          eq(notificationLogs.status, "failed"),
          eq(notificationLogs.status, "retrying")
        ),
        lte(notificationLogs.attempts, 2)
      )
    )
    .orderBy(asc(notificationLogs.sentAt))
    .limit(maxBatch);

  let retried = 0;
  for (const row of retryCandidates) {
    await updateNotificationStatus({
      notificationId: row.id,
      status: "retrying",
    });
    await processNotificationDelivery({
      notificationId: row.id,
    });
    retried += 1;
  }

  return { retried };
}
