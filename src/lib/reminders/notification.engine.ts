// reminders/notification.engine.ts

import { db } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";

import {
  reminderOccurrences,
  reminders,
  notificationLogs,
} from "@/lib/db/schema";

import { logEvent } from "@/lib/reminders/reminder.commands";

type MarkDueParams = {
  occurrenceId: string;
  reminderId: string;
  userId?: string | null;
};

/**
 * Marks an occurrence as due + creates notification
 * 🔥 SAFE: idempotent (won’t double-trigger)
 */
export async function markOccurrenceAsDue(params: MarkDueParams) {
  return db.transaction(async (tx) => {
    // 1. Mark occurrence as triggered (ONLY if not already)
    const [occurrence] = await tx
      .update(reminderOccurrences)
      .set({
        triggeredAt: new Date(),
      })
      .where(
        and(
          eq(reminderOccurrences.id, params.occurrenceId),
          sql`${reminderOccurrences.triggeredAt} IS NULL`
        )
      )
      .returning();

    // 🔒 Already processed (important!)
    if (!occurrence) {
      console.log("⚠️ Already triggered, skipping:", params.occurrenceId);
      return null;
    }

    // 2. Fetch reminder info (for UI + link)
    const [reminderRow] = await tx
      .select({
        id: reminders.id,
        title: reminders.title,
        babyId: reminders.babyId,
      })
      .from(reminders)
      .where(eq(reminders.id, params.reminderId))
      .limit(1);

    // 3. Insert notification
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
          title: reminderRow?.title ?? "Reminder due",
          scheduledFor: occurrence.scheduledFor,
          actionUrl: reminderRow
            ? `/dashboard/${reminderRow.babyId}/reminders/${params.reminderId}`
            : null,
          severity: "warning",
          readAt: null,
          status: "queued",
          attempts: 0,
          errorMessage: null,
        })
        .returning({ id: notificationLogs.id });

    } catch (error) {
      if (!isMissingColumnError(error)) {
        console.error("❌ Notification insert failed:", error);
        throw error;
      }

      // 🧯 fallback for old schema
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

    // 4. Log action (for audit + analytics)
    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: params.occurrenceId,
      userId: params.userId ?? null,
      actionType: "created",
      previousValue: { triggeredAt: null },
      newValue: {
        event: "occurrence.due",
        triggeredAt: occurrence.triggeredAt,
      },
    });

    console.log("📬 Notification created:", {
      occurrenceId: params.occurrenceId,
      notificationId: notification?.id,
    });

    return {
      ...occurrence,
      notificationId: notification?.id ?? null,
    };
  });
}