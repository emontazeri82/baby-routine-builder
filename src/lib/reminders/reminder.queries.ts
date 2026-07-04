//reminders/reminder.queries
import { db } from "@/lib/db";
import { and, eq, lte, gte, asc, desc, or, sql } from "drizzle-orm";

import {
  babies,
  reminders,
  reminderOccurrences,
  notificationLogs,
} from "@/lib/db/schema";

import { throwDomainError } from "./reminder.errors";
import type { ReminderCurrentState } from "./reminder.types";

type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export async function assertBabyOwnership(params: { babyId: string; userId: string }) {
  const baby = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, params.babyId), eq(babies.userId, params.userId)))
    .limit(1);

  return baby.length > 0;
}

export async function getReminderOwnedByUser(params: {
  reminderId: string;
  userId: string;
}) {
  const reminder = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, params.reminderId))
    .limit(1)
    .then((rows: Array<(typeof reminders.$inferSelect) | undefined>) => rows[0]);

  if (!reminder) return null;

  const owned = await assertBabyOwnership({
    babyId: reminder.babyId,
    userId: params.userId,
  });

  return owned ? reminder : null;
}
export async function findTargetOccurrence(params: {
  dbOrTx?: DbExecutor;
  reminderId: string;
  occurrenceId?: string;
  dueOnly?: boolean;
}) {
  const dbOrTx = params.dbOrTx ?? db;
  const now = new Date();

  if (params.occurrenceId) {
    return dbOrTx
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.id, params.occurrenceId),
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      )
      .limit(1)
      .then((rows: Array<(typeof reminderOccurrences.$inferSelect) | undefined>) => rows[0]);
  }

  if (!params.dueOnly) {
    return dbOrTx
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, params.reminderId),
          eq(reminderOccurrences.status, "pending")
        )
      )
      .orderBy(asc(reminderOccurrences.scheduledFor))
      .limit(1)
      .then((rows: Array<(typeof reminderOccurrences.$inferSelect) | undefined>) => rows[0]);
  }

  return dbOrTx
    .select()
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .where(
      and(
        eq(reminderOccurrences.reminderId, params.reminderId),
        eq(reminderOccurrences.status, "pending"),
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
        )
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(1)
    .then((rows) => rows[0]?.reminder_occurrences);
}
export async function getDueOccurrencesForBaby(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const now = new Date();

  return db
    .select({
      id: reminderOccurrences.id,
      reminderId: reminderOccurrences.reminderId,
      scheduledFor: reminderOccurrences.scheduledFor,
      snoozeUntil: reminderOccurrences.snoozeUntil,
      reminderTitle: reminders.title,
      scheduleType: reminders.scheduleType,
    })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .innerJoin(babies, eq(reminders.babyId, babies.id))
    .where(
      and(
        eq(reminders.babyId, params.babyId),
        eq(reminders.status, "active"),
        eq(reminderOccurrences.status, "pending"),
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
        )
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(100);
}

export async function getNotificationsForBaby(params: {
  babyId: string;
  userId: string;
}) {
  const owned = await assertBabyOwnership({
    babyId: params.babyId,
    userId: params.userId,
  });
  if (!owned) throwDomainError("FORBIDDEN");

  const isMissingColumnError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42703";

  type NotificationListItem = {
    id: string;
    reminderId: string | null;
    occurrenceId?: string | null;
    activityTypeId?: string | null;
    reminderStatus?: string | null;
    scheduleType?: string | null;
    currentState?: ReminderCurrentState | null;
    hasDueOccurrence?: boolean;
    dueOccurrenceCount?: number;
    title: string | null;
    scheduledFor: Date | null;
    status?: string | null;
    readAt?: Date | null;
    createdAt: Date;
    actionUrl?: string | null;
    severity?: string | null;
    errorMessage?: string | null;
    attempts?: number | null;
    smartState?: string;
    count?: number;
  };

  let notifications: NotificationListItem[] = [];
  let unreadCount = 0;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ✅ SMART STATE HELPER (SAFE)
  function getSmartState(n: { scheduledFor: Date | null }) {
    if (!n.scheduledFor) return "unknown";

    const diff = n.scheduledFor.getTime() - now.getTime();

    if (diff < -15 * 60 * 1000) return "critical";
    if (diff < -5 * 60 * 1000) return "missed";
    if (Math.abs(diff) <= 5 * 60 * 1000) return "now";
    return "upcoming";
  }

  try {
    notifications = await db
      .selectDistinctOn(
        [notificationLogs.reminderId, notificationLogs.occurrenceId],
        {
          id: notificationLogs.id,
          reminderId: notificationLogs.reminderId,
          occurrenceId: notificationLogs.occurrenceId,
          activityTypeId: reminders.activityTypeId,
          reminderStatus: reminders.status,
          scheduleType: reminders.scheduleType,
          currentState: sql<ReminderCurrentState>`(
            case
              when ${reminders.status} = 'cancelled' then 'cancelled'
              when exists (
                select 1
                from ${reminderOccurrences} ro
                where ro."reminder_id" = ${reminders.id}
                  and ro."status" = 'pending'
                  and ro."scheduled_for" >= now()
                  and (
                    ro."snooze_until" is null
                    or ro."snooze_until" <= now()
                  )
              ) then 'upcoming'
              else 'upcoming'
            end
          )`,
          hasDueOccurrence: sql<boolean>`(
            exists(
              select 1
              from ${reminderOccurrences} ro
              where ro."reminder_id" = ${reminders.id}
                and ro."status" = 'pending'
            )
          )`,
          dueOccurrenceCount: sql<number>`(
            select count(*)
            from ${reminderOccurrences} ro
            where ro."reminder_id" = ${reminders.id}
              and ro."status" = 'pending'
          )`,
          title: notificationLogs.title,
          scheduledFor: notificationLogs.scheduledFor,
          status: notificationLogs.status,
          readAt: notificationLogs.readAt,
          createdAt: notificationLogs.sentAt,
          actionUrl: notificationLogs.actionUrl,
          severity: notificationLogs.severity,
          errorMessage: notificationLogs.errorMessage,
          attempts: notificationLogs.attempts,
        }
      )
      .from(notificationLogs)
      .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
      .where(
        and(
          eq(reminders.babyId, params.babyId),

          // ✅ FIXED FILTER (VERY IMPORTANT)
          or(
            gte(notificationLogs.scheduledFor, windowStart),
            sql`${notificationLogs.scheduledFor} is null`,
            gte(notificationLogs.sentAt, windowStart)
          )
        )
      )
      .orderBy(
        notificationLogs.reminderId,
        notificationLogs.occurrenceId,
        desc(notificationLogs.sentAt)
      )
      .limit(100);

    // ✅ SORT
    notifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    // ✅ ADD SMART STATE (NON-BREAKING)
    notifications = notifications.map((n) => ({
      ...n,
      smartState: getSmartState(n),
    }));
    console.log("NOTIFICATIONS COUNT:", notifications.length);
    // 🔥 GROUP (UNCHANGED LOGIC)
    const groupedMap = new Map<string, NotificationListItem>();

    for (const n of notifications) {
      const key = `${n.reminderId}-${n.reminderStatus}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...n,
          count: 1,
        });
      } else {
        const existing = groupedMap.get(key);
        if (existing) {
          existing.count = (existing.count ?? 1) + 1;
        }
      }
    }

    notifications = Array.from(groupedMap.values());

    // ✅ UNREAD COUNT (FIXED)
    unreadCount = notifications.filter((n) => !n.readAt).length;
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    console.log("⚠️ USING FALLBACK PATH");

    const legacy = await db
      .select({
        id: notificationLogs.id,
        reminderId: notificationLogs.reminderId,
        status: notificationLogs.status,
        errorMessage: notificationLogs.errorMessage,
        createdAt: notificationLogs.sentAt,
      })
      .from(notificationLogs)
      .innerJoin(reminders, eq(notificationLogs.reminderId, reminders.id))
      .where(eq(reminders.babyId, params.babyId))
      .orderBy(desc(notificationLogs.sentAt))
      .limit(100);

    notifications = legacy.map((n) => ({
      id: n.id,
      reminderId: n.reminderId,
      occurrenceId: null,
      activityTypeId: null,
      reminderStatus: "active",
      scheduleType: null,
      currentState: null,

      hasDueOccurrence: false,
      dueOccurrenceCount: 0,

      title: "Reminder notification",
      scheduledFor: n.createdAt,
      status: n.status ?? "queued",
      readAt: null,
      createdAt: n.createdAt,
      actionUrl: null,
      severity: "info",
      errorMessage: n.errorMessage,
      attempts: 0,

      smartState: getSmartState({ scheduledFor: n.createdAt }),
    }));

    unreadCount = notifications.filter((n) => !n.readAt).length;
  }

  return {
    notifications,
    unreadCount,
  };
}
