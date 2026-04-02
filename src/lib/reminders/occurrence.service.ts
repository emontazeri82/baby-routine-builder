//reminders/occurrence.service
import { db } from "@/lib/db";
import { eq, and, lte, desc, or, sql } from "drizzle-orm";

import { reminderOccurrences, reminders, activities } from "@/lib/db/schema";

import { getReminderOwnedByUser, findTargetOccurrence } from "./reminder.queries";
import { logEvent } from "./reminder.commands";
import { throwDomainError } from "./reminder.errors";
import { generateOccurrencesForReminder } from "@/lib/reminderEngine/generateOccurrences";

export async function snoozeOccurrence(params: {
  reminderId: string;
  userId: string;
  minutes: number;
  occurrenceId?: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");
  if (reminder.allowSnooze === false) {
    throwDomainError("SNOOZE_DISABLED");
  }

  const occurrence = await findTargetOccurrence({
    reminderId: params.reminderId,
    occurrenceId: params.occurrenceId,
    dueOnly: false,
  });

  if (!occurrence) throwDomainError("NO_OCCURRENCE");
  if (
    reminder.maxSnoozes !== null &&
    reminder.maxSnoozes !== undefined &&
    (occurrence.snoozedCount ?? 0) >= reminder.maxSnoozes
  ) {
    throwDomainError("MAX_SNOOZE_REACHED");
  }

  const snoozeUntil = new Date(Date.now() + params.minutes * 60 * 1000);

  const [updated] = await db
    .update(reminderOccurrences)
    .set({
      snoozeUntil,
      snoozedCount: (occurrence.snoozedCount ?? 0) + 1,
    })
    .where(eq(reminderOccurrences.id, occurrence.id))
    .returning();

  await logEvent({
    tx: db,
    reminderId: params.reminderId,
    occurrenceId: occurrence.id,
    userId: params.userId,
    actionType: "snoozed",
    previousValue: {
      snoozeUntil: occurrence.snoozeUntil,
      snoozedCount: occurrence.snoozedCount ?? 0,
    },
    newValue: {
      event: "occurrence.snoozed",
      snoozeUntil,
      snoozedCount: updated.snoozedCount ?? 0,
    },
  });

  return {
    ...updated,
    babyId: reminder.babyId,
  };
}

export async function completeOccurrence(params: {
  reminderId: string;
  userId: string;
  occurrenceId?: string;
  linkedActivityId?: string;
  autoCreateActivity?: boolean;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const now = new Date();
    let occurrence = await findTargetOccurrence({
      dbOrTx: tx,
      reminderId: params.reminderId,
      occurrenceId: params.occurrenceId,
      dueOnly: true,
    });

    if (!occurrence && reminder.status === "active") {
      if (reminder.scheduleType === "one-time" && reminder.remindAt <= now) {
        const latestOccurrence = await tx
          .select({
            status: reminderOccurrences.status,
          })
          .from(reminderOccurrences)
          .where(eq(reminderOccurrences.reminderId, params.reminderId))
          .orderBy(desc(reminderOccurrences.scheduledFor))
          .limit(1)
          .then((rows) => rows[0]);

        if (latestOccurrence?.status === "completed") {
          throwDomainError("ALREADY_COMPLETED");
        }
        if (latestOccurrence?.status === "skipped") {
          throwDomainError("ALREADY_SKIPPED");
        }

        await tx
          .insert(reminderOccurrences)
          .values({
            reminderId: params.reminderId,
            scheduledFor: reminder.remindAt,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      } else if (
        (reminder.scheduleType === "recurring" ||
          reminder.scheduleType === "interval") &&
        reminder.remindAt <= now
      ) {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          lookbackHours: 48,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      occurrence = await findTargetOccurrence({
        dbOrTx: tx,
        reminderId: params.reminderId,
        occurrenceId: params.occurrenceId,
        dueOnly: true,
      });
    }

    if (!occurrence) {
      const latest = await tx
        .select({
          status: reminderOccurrences.status,
          snoozeUntil: reminderOccurrences.snoozeUntil,
        })
        .from(reminderOccurrences)
        .where(eq(reminderOccurrences.reminderId, params.reminderId))
        .orderBy(desc(reminderOccurrences.scheduledFor))
        .limit(1)
        .then((rows) => rows[0]);

      if (latest?.status === "completed") throwDomainError("ALREADY_COMPLETED");
      if (latest?.status === "skipped") throwDomainError("ALREADY_SKIPPED");
      if (
        latest?.status === "pending" &&
        latest.snoozeUntil &&
        latest.snoozeUntil > now
      ) {
        throwDomainError("SNOOZED_NOT_DUE");
      }
      throwDomainError("NO_DUE_OCCURRENCE");
    }

    let linkedActivityId: string | null = params.linkedActivityId ?? null;

    // ✅ ONLY create activity if requested
    if (!linkedActivityId && params.autoCreateActivity && reminder.activityTypeId) {
      const [activity] = await tx
        .insert(activities)
        .values({
          id: crypto.randomUUID(),

          babyId: reminder.babyId,
          activityTypeId: reminder.activityTypeId,

          // 🔥 Better naming (important for your schema)
          startTime: now,
          endTime: null,

          notes: reminder.description ?? null,

          createdBy: params.userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: activities.id });

      linkedActivityId = activity.id;
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        status: "completed",
        completedAt: now,
        linkedActivityId,
        triggeredAt: now,
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "completed",
      previousValue: { status: occurrence.status },
      newValue: {
        event: "occurrence.completed",
        status: "completed",
        linkedActivityId,
      },
    });

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ status: "cancelled" })
        .where(eq(reminders.id, reminder.id));

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: occurrence.id,
        userId: params.userId,
        actionType: "cancelled",
        previousValue: { status: reminder.status },
        newValue: { event: "reminder.cancelled", status: "cancelled" },
      });
    } else if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
      linkedActivityId, // ✅ NOW VALID
      activityCreated: !!params.autoCreateActivity, // ✅ NOW VALID
    };
  });
}

export async function skipOccurrence(params: {
  reminderId: string;
  userId: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const now = new Date();
    let occurrence = await findTargetOccurrence({
      dbOrTx: tx,
      reminderId: params.reminderId,
      dueOnly: true,
    });

    if (!occurrence && reminder.status === "active") {
      if (reminder.scheduleType === "one-time" && reminder.remindAt <= now) {
        const latestOccurrence = await tx
          .select({
            status: reminderOccurrences.status,
          })
          .from(reminderOccurrences)
          .where(eq(reminderOccurrences.reminderId, params.reminderId))
          .orderBy(desc(reminderOccurrences.scheduledFor))
          .limit(1)
          .then((rows) => rows[0]);

        if (latestOccurrence?.status === "completed") {
          throwDomainError("ALREADY_COMPLETED");
        }
        if (latestOccurrence?.status === "skipped") {
          throwDomainError("ALREADY_SKIPPED");
        }

        await tx
          .insert(reminderOccurrences)
          .values({
            reminderId: params.reminderId,
            scheduledFor: reminder.remindAt,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              reminderOccurrences.reminderId,
              reminderOccurrences.scheduledFor,
            ],
          });
      } else if (
        (reminder.scheduleType === "recurring" ||
          reminder.scheduleType === "interval") &&
        reminder.remindAt <= now
      ) {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          lookbackHours: 48,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      occurrence = await findTargetOccurrence({
        dbOrTx: tx,
        reminderId: params.reminderId,
        dueOnly: true,
      });
    }

    if (!occurrence) {
      const latest = await tx
        .select({
          status: reminderOccurrences.status,
          snoozeUntil: reminderOccurrences.snoozeUntil,
        })
        .from(reminderOccurrences)
        .where(eq(reminderOccurrences.reminderId, params.reminderId))
        .orderBy(desc(reminderOccurrences.scheduledFor))
        .limit(1)
        .then((rows) => rows[0]);

      if (latest?.status === "completed") throwDomainError("ALREADY_COMPLETED");
      if (latest?.status === "skipped") throwDomainError("ALREADY_SKIPPED");
      if (
        latest?.status === "pending" &&
        latest.snoozeUntil &&
        latest.snoozeUntil > now
      ) {
        throwDomainError("SNOOZED_NOT_DUE");
      }
      throwDomainError("NO_DUE_OCCURRENCE");
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        status: "skipped",
        completedAt: null,
        triggeredAt: new Date(),
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "skipped",
      previousValue: { status: occurrence.status },
      newValue: { event: "occurrence.skipped", status: "skipped" },
    });

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ status: "cancelled" })
        .where(eq(reminders.id, reminder.id));

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: occurrence.id,
        userId: params.userId,
        actionType: "cancelled",
        previousValue: { status: reminder.status },
        newValue: { event: "reminder.cancelled", status: "cancelled" },
      });
    } else if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
    };
  });
}

export async function rescheduleOccurrence(params: {
  reminderId: string;
  userId: string;
  remindAt: Date;
  occurrenceId?: string;
}) {
  const reminder = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!reminder) throwDomainError("NOT_FOUND");

  const occurrence = await findTargetOccurrence({
    reminderId: params.reminderId,
    occurrenceId: params.occurrenceId,
    dueOnly: false,
  });

  return db.transaction(async (tx) => {
    if (!occurrence) {
      // Recovery path: create a fresh pending occurrence so manual reschedule
      // still works even when no pending occurrence exists.
      const [createdOccurrence] = await tx
        .insert(reminderOccurrences)
        .values({
          reminderId: params.reminderId,
          scheduledFor: params.remindAt,
          status: "pending",
        })
        .onConflictDoNothing({
          target: [
            reminderOccurrences.reminderId,
            reminderOccurrences.scheduledFor,
          ],
        })
        .returning();

      if (reminder.scheduleType === "one-time") {
        await tx
          .update(reminders)
          .set({ remindAt: params.remindAt })
          .where(eq(reminders.id, params.reminderId));
      }

      await logEvent({
        tx,
        reminderId: params.reminderId,
        occurrenceId: createdOccurrence?.id ?? null,
        userId: params.userId,
        actionType: "rescheduled",
        previousValue: null,
        newValue: {
          event: "occurrence.rescheduled",
          scheduledFor: params.remindAt,
          source: "created_when_missing",
        },
      });

      const [latestPending] = await tx
        .select()
        .from(reminderOccurrences)
        .where(
          and(
            eq(reminderOccurrences.reminderId, params.reminderId),
            eq(reminderOccurrences.status, "pending"),
            eq(reminderOccurrences.scheduledFor, params.remindAt)
          )
        )
        .limit(1);

      if (!latestPending) throwDomainError("NO_OCCURRENCE");

      if (reminder.status === "active") {
        await generateOccurrencesForReminder({
          dbOrTx: tx,
          reminder,
          horizonDays: 14,
          maxOccurrences: 50,
        });
      }

      return {
        ...latestPending,
        babyId: reminder.babyId,
      };
    }

    const [updatedOccurrence] = await tx
      .update(reminderOccurrences)
      .set({
        scheduledFor: params.remindAt,
        status: "pending",
        snoozeUntil: null,
      })
      .where(eq(reminderOccurrences.id, occurrence.id))
      .returning();

    if (reminder.scheduleType === "one-time") {
      await tx
        .update(reminders)
        .set({ remindAt: params.remindAt })
        .where(eq(reminders.id, params.reminderId));
    }

    await logEvent({
      tx,
      reminderId: params.reminderId,
      occurrenceId: occurrence.id,
      userId: params.userId,
      actionType: "rescheduled",
      previousValue: { scheduledFor: occurrence.scheduledFor },
      newValue: {
        event: "occurrence.rescheduled",
        scheduledFor: params.remindAt,
      },
    });

    if (reminder.status === "active") {
      await generateOccurrencesForReminder({
        dbOrTx: tx,
        reminder,
        horizonDays: 14,
        maxOccurrences: 50,
      });
    }

    return {
      ...updatedOccurrence,
      babyId: reminder.babyId,
    };
  });
}

export async function cancelReminder(params: {
  reminderId: string;
  userId: string;
}) {
  const existing = await getReminderOwnedByUser({
    reminderId: params.reminderId,
    userId: params.userId,
  });
  if (!existing) throwDomainError("NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(reminders)
      .set({ status: "cancelled" })
      .where(eq(reminders.id, params.reminderId));

    await tx
      .update(reminderOccurrences)
      .set({ status: "expired" })
      .where(
        and(
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      );

    await logEvent({
      tx,
      reminderId: params.reminderId,
      userId: params.userId,
      actionType: "cancelled",
      previousValue: { status: existing.status },
      newValue: { event: "reminder.cancelled", status: "cancelled" },
    });
  });
}