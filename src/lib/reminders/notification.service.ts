//reminders/notification.service
import { db } from "@/lib/db";
import { and, eq, lte, sql } from "drizzle-orm";

import {
  notificationLogs,
  reminders,
  reminderActionLogs,
} from "@/lib/db/schema";

import { assertBabyOwnership } from "@/lib/reminders/reminder.queries";
import { throwDomainError } from "@/lib/reminders/reminder.errors";
import type { NotificationStatus } from "@/lib/reminders/reminder.types";

import { bumpNotificationCacheVersion } from "@/lib/cache";

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

  const wasUnread = !notification.readAt;

  const [updated] = await db
    .update(notificationLogs)
    .set({ readAt: notification.readAt ?? new Date() })
    .where(eq(notificationLogs.id, params.notificationId))
    .returning();

  if (wasUnread) {
    await bumpNotificationCacheVersion(
      params.userId,
      notification.reminderBabyId
    );
  }

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

  const updated = await db
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
    )
    .returning({ id: notificationLogs.id });

  if (updated.length > 0) {
    await bumpNotificationCacheVersion(
      params.userId,
      params.babyId
    );
  }
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

  const result = await db
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

  if (result.length > 0) {
    await bumpNotificationCacheVersion(
      params.userId,
      params.babyId
    );
  }

  return result;
}

export async function updateNotificationStatus(params: {
  notificationId: string;
  status: NotificationStatus;
  errorMessage?: string | null;
}) {
  const maxRetries = 3;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: notificationLogs.id,
        reminderId: notificationLogs.reminderId,
        userId: notificationLogs.userId,
        babyId: reminders.babyId, // ✅ ADD THIS
        attempts: notificationLogs.attempts,
        status: notificationLogs.status,
        occurrenceId: notificationLogs.occurrenceId,
        sentAt: notificationLogs.sentAt,
        errorMessage: notificationLogs.errorMessage,
      })
      .from(notificationLogs)
      .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id)) // ✅ JOIN
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

    // ✅ 🔥 ADD THIS
    const changed =
      existing.status !== nextStatus ||
      existing.attempts !== nextAttempts ||
      existing.errorMessage !== params.errorMessage;

    if (!existing.userId || !existing.babyId) {
      console.warn("⚠️ Missing cache invalidation context", existing);
    } else if (changed) {
      await bumpNotificationCacheVersion(
        existing.userId,
        existing.babyId
      );
    }
    return updated;
  });
}

export async function markExpiredNotificationsAsRead(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const now = new Date();

  const updated = await db
    .update(notificationLogs)
    .set({ readAt: new Date() })
    .where(
      and(
        sql`${notificationLogs.reminderId} in (
          select ${reminders.id}
          from ${reminders}
          where ${reminders.babyId} = ${params.babyId}
        )`,
        sql`${notificationLogs.readAt} is null`,
        lte(notificationLogs.scheduledFor, now)
      )
    )
    .returning({ id: notificationLogs.id }); // ✅ KEY CHANGE

  // ✅ Only invalidate cache if something actually changed
  if (updated.length > 0) {
    await bumpNotificationCacheVersion(
      params.userId,
      params.babyId
    );
  }
}