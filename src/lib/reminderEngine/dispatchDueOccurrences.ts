import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import {
  babies,
  notificationLogs,
  reminderOccurrences,
  reminders,
  userPreferences,
  users,
} from "@/lib/db/schema";
import { sendReminderEmail } from "@/lib/email/sendReminderEmail";
import {
  markOccurrenceAsDue,
  updateNotificationStatus,
} from "@/lib/reminders";
import { expireOldOccurrences } from "@/lib/reminders/reminder.commands";

type DispatchSummary = {
  processedCount: number;
  skippedCount: number;
};

type ReminderEmailPayload = {
  occurrenceId: string;
  userId: string;
  recipientEmail: string;
  babyName: string;
  babyTimezone: string | null;
  reminderTitle: string | null;
  notificationTitle?: string | null;
  scheduleType: "one-time" | "recurring" | "interval";
  scheduledFor: Date;
  actionUrl: string | null;
};

const DEFAULT_EMAIL_REMINDER_MIN_GAP_MINUTES = 120;

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function resolveActionUrl(actionUrl: string | null) {
  if (!actionUrl) return getAppUrl();
  if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
    return actionUrl;
  }
  return `${getAppUrl()}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`;
}

function getEmailReminderMinGapMinutes() {
  const raw = process.env.EMAIL_REMINDER_MIN_GAP_MINUTES;
  const parsed = raw ? Number(raw) : DEFAULT_EMAIL_REMINDER_MIN_GAP_MINUTES;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_EMAIL_REMINDER_MIN_GAP_MINUTES;
}

async function canSendReminderEmail(payload: ReminderEmailPayload) {
  const minGapMinutes = getEmailReminderMinGapMinutes();

  const recent = await db
    .select({ id: reminderOccurrences.id })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .where(
      and(
        eq(babies.userId, payload.userId),
        sql`${reminderOccurrences.id} <> ${payload.occurrenceId}`,
        sql`${reminderOccurrences.notificationSentAt} is not null`,
        sql`${reminderOccurrences.notificationSentAt} >= now() - (${minGapMinutes} * interval '1 minute')`
      )
    )
    .limit(1);

  return recent.length === 0;
}

async function sendOccurrenceEmail(payload: ReminderEmailPayload) {
  await sendReminderEmail({
    to: payload.recipientEmail,
    babyName: payload.babyName,
    reminderTitle:
      payload.notificationTitle ?? payload.reminderTitle ?? "Reminder due",
    scheduledFor: formatInTimeZone(
      payload.scheduledFor,
      payload.babyTimezone ?? "UTC",
      "PPp"
    ),
    actionUrl: resolveActionUrl(payload.actionUrl),
  });
}

async function processUpcomingReminderEmails(params?: { babyId?: string }) {
  const upcoming = await db
    .select({
      occurrenceId: reminderOccurrences.id,
      scheduledFor: sql<Date>`${reminderOccurrences.scheduledFor} at time zone coalesce(${babies.timezone}, 'UTC')`,
      reminderId: reminders.id,
      reminderTitle: reminders.title,
      scheduleType: reminders.scheduleType,
      babyId: babies.id,
      babyName: babies.name,
      babyTimezone: babies.timezone,
      userId: users.id,
      recipientEmail: users.email,
      leadMinutes: userPreferences.emailReminderLeadMinutes,
    })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .innerJoin(users, eq(babies.userId, users.id))
    .innerJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(
      and(
        eq(reminders.status, "active"),
        eq(reminderOccurrences.status, "pending"),
        eq(userPreferences.emailRemindersEnabled, true),
        sql`${userPreferences.emailReminderLeadMinutes} > 0`,
        sql`${reminderOccurrences.triggeredAt} is null`,
        sql`${reminderOccurrences.notificationSentAt} is null`,
        sql`${reminderOccurrences.scheduledFor} > (
          case
            when ${reminders.scheduleType} in ('one-time', 'interval')
              then now() at time zone coalesce(${babies.timezone}, 'UTC')
            else now() at time zone 'UTC'
          end
        )`,
        sql`${reminderOccurrences.scheduledFor} <= (
          case
            when ${reminders.scheduleType} in ('one-time', 'interval')
              then now() at time zone coalesce(${babies.timezone}, 'UTC')
            else now() at time zone 'UTC'
          end
        ) + (${userPreferences.emailReminderLeadMinutes} * interval '1 minute')`,
        params?.babyId ? eq(reminders.babyId, params.babyId) : sql`true`
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(100);

  let sentCount = 0;

  for (const item of upcoming) {
    const claimed = await db
      .update(reminderOccurrences)
      .set({ notificationSentAt: new Date() })
      .where(
        and(
          eq(reminderOccurrences.id, item.occurrenceId),
          sql`${reminderOccurrences.notificationSentAt} is null`
        )
      )
      .returning({ id: reminderOccurrences.id });

    if (!claimed.length) continue;

    try {
      const payload = {
        occurrenceId: item.occurrenceId,
        userId: item.userId,
        recipientEmail: item.recipientEmail,
        babyName: item.babyName,
        babyTimezone: item.babyTimezone,
        reminderTitle: item.reminderTitle,
        scheduleType: item.scheduleType,
        scheduledFor: item.scheduledFor,
        actionUrl: `/dashboard/${item.babyId}/reminders/${item.reminderId}`,
      };

      if (!(await canSendReminderEmail(payload))) {
        await db
          .update(reminderOccurrences)
          .set({ notificationSentAt: null })
          .where(eq(reminderOccurrences.id, item.occurrenceId));
        continue;
      }

      await sendOccurrenceEmail({
        ...payload,
      });

      sentCount += 1;
    } catch (error) {
      await db
        .update(reminderOccurrences)
        .set({ notificationSentAt: null })
        .where(eq(reminderOccurrences.id, item.occurrenceId));

      console.error("Lead-time reminder email failed", error);
    }
  }

  return sentCount;
}

export async function dispatchDueOccurrences(params?: {
  babyId?: string;
}): Promise<DispatchSummary> {
  await expireOldOccurrences();
  await processUpcomingReminderEmails(params);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseWhere = and(
    eq(reminders.status, "active"),
    eq(reminderOccurrences.status, "pending"),
    gte(reminderOccurrences.scheduledFor, windowStart),
    sql`${reminderOccurrences.scheduledFor} <= (
      case
        when ${reminders.scheduleType} in ('one-time', 'interval')
          then now() at time zone coalesce(${babies.timezone}, 'UTC')
        else now() at time zone 'UTC'
      end
    )`,
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
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .where(baseWhere)
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(100);

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
      title: notificationLogs.title,
      scheduledFor: sql<Date | null>`${notificationLogs.scheduledFor} at time zone coalesce(${babies.timezone}, 'UTC')`,
      actionUrl: notificationLogs.actionUrl,
      reminderTitle: reminders.title,
      scheduleType: reminders.scheduleType,
      babyName: babies.name,
      babyTimezone: babies.timezone,
      userId: users.id,
      recipientEmail: users.email,
      emailRemindersEnabled: userPreferences.emailRemindersEnabled,
      occurrenceId: notificationLogs.occurrenceId,
      occurrenceEmailSentAt: reminderOccurrences.notificationSentAt,
    })
    .from(notificationLogs)
    .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .innerJoin(users, eq(babies.userId, users.id))
    .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
    .leftJoin(
      reminderOccurrences,
      eq(notificationLogs.occurrenceId, reminderOccurrences.id)
    )
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
    if (
      existing.emailRemindersEnabled &&
      existing.scheduledFor &&
      !existing.occurrenceEmailSentAt
    ) {
      const payload = {
        occurrenceId: existing.occurrenceId ?? "",
        userId: existing.userId,
        recipientEmail: existing.recipientEmail,
        babyName: existing.babyName,
        babyTimezone: existing.babyTimezone,
        reminderTitle: existing.reminderTitle,
        notificationTitle: existing.title,
        scheduleType: existing.scheduleType,
        scheduledFor: existing.scheduledFor,
        actionUrl: existing.actionUrl,
      };

      if (await canSendReminderEmail(payload)) {
        await sendOccurrenceEmail(payload);

        if (existing.occurrenceId) {
          await db
            .update(reminderOccurrences)
            .set({ notificationSentAt: new Date() })
            .where(
              and(
                eq(reminderOccurrences.id, existing.occurrenceId),
                sql`${reminderOccurrences.notificationSentAt} is null`
              )
            );
        }
      }
    }

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
