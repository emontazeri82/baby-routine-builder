import { CronExpressionParser } from "cron-parser";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { babies, reminderOccurrences, reminders } from "@/lib/db/schema";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";

import { expireOldOccurrences } from "./reminder.commands";
import { throwDomainError } from "./reminder.errors";
import {
  assertBabyOwnership,
  getReminderOwnedByUser,
} from "./reminder.queries";
import type { ReminderCurrentState, ReminderStatus } from "./reminder.types";
import { resolveRecurringCronExpressionFromReminder } from "./reminder.utils";

import type { ReminderDTO, ListRemindersParams } from "./reminder.types";

const occurrenceCounts = db
  .select({
    reminderId: reminderOccurrences.reminderId,
    pendingOccurrences: sql<number>`COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'pending')`.as("pending_occurrences"),
    completedOccurrences: sql<number>`COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'completed')`.as("completed_occurrences"),
    skippedOccurrences: sql<number>`COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'skipped')`.as("skipped_occurrences"),
    expiredOccurrences: sql<number>`COUNT(*) FILTER (WHERE ${reminderOccurrences.status} = 'expired')`.as("expired_occurrences"),
  })
  .from(reminderOccurrences)
  .where(sql`
    ${reminderOccurrences.scheduledFor} >= now() - interval '30 days'
    and ${reminderOccurrences.scheduledFor} <= now() + interval '30 days'
  `)
  .groupBy(reminderOccurrences.reminderId)
  .as("occurrenceCounts");

export async function getReminderById(params: {
  reminderId: string;
  userId: string;
}) {
  const reminder = await getReminderOwnedByUser(params);
  if (!reminder) throwDomainError("NOT_FOUND");
  return reminder;
}

export async function listReminders(
  params: ListRemindersParams
): Promise<ReminderDTO[]> {
  await expireOldOccurrences();

  const owned = await assertBabyOwnership(params);
  if (!owned) throwDomainError("FORBIDDEN");

  await generateOccurrencesForActiveReminders({
    babyId: params.babyId,
    horizonDays: 14,
    maxOccurrences: 50,
  });

  const whereClause =
    params.status === "all"
      ? eq(reminders.babyId, params.babyId)
      : and(eq(reminders.babyId, params.babyId), eq(reminders.status, params.status));

  const babyTimezone =
    (
      await db
        .select({ timezone: babies.timezone })
        .from(babies)
        .where(eq(babies.id, params.babyId))
        .limit(1)
        .then((r) => r[0]?.timezone)
    ) ?? "UTC";

  const data = await db
    .select({
      id: reminders.id,
      babyId: reminders.babyId,
      activityTypeId: reminders.activityTypeId,
      title: reminders.title,
      description: reminders.description,
      scheduleType: reminders.scheduleType,
      status: reminders.status,
      remindAt: reminders.remindAt,
      cronExpression: reminders.cronExpression,
      repeatIntervalMinutes: reminders.repeatIntervalMinutes,
      allowSnooze: reminders.allowSnooze,
      adaptiveEnabled: reminders.adaptiveEnabled,
      priority: reminders.priority,
      tags: reminders.tags,
      createdAt: reminders.createdAt,

      currentState: sql<ReminderCurrentState>`(
        case
          when ${reminders.status} = 'cancelled' then 'cancelled'
          when ${reminders.scheduleType} = 'one-time'
            and ${reminders.status} = 'active'
            and ${reminders.remindAt} <= now()
            and not exists (
              select 1 from reminder_occurrences ro_any
              where ro_any.reminder_id = ${reminders.id}
            ) then 'overdue'
          when exists (
            select 1 from reminder_occurrences ro
            where ro.reminder_id = ${reminders.id}
              and ro.status = 'pending'
              and ro.scheduled_for <= now()
              and (ro.snooze_until is null or ro.snooze_until <= now())
          ) then 'overdue'
          when exists (
            select 1 from reminder_occurrences ro
            where ro.reminder_id = ${reminders.id}
              and ro.status = 'pending'
              and ro.snooze_until > now()
          ) then 'snoozed'
          else 'upcoming'
        end
      )`,

      nextUpcomingAt: sql<Date | null>`(
        select ro.scheduled_for
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.scheduled_for > now()
        order by ro.scheduled_for asc
        limit 1
      )`,

      overdueCount: sql<number>`(
        select count(*)
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.scheduled_for <= now()
          and (ro.snooze_until is null or ro.snooze_until <= now())
      )`,

      hasDueOccurrence: sql<boolean>`(
        exists(
          select 1 from reminder_occurrences ro
          where ro.reminder_id = ${reminders.id}
            and ro.status = 'pending'
            and ro.scheduled_for <= now()
            and (ro.snooze_until is null or ro.snooze_until <= now())
        )
      )`,
      occurrenceId: sql<string | null>`(
        select ro.id
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.scheduled_for <= now()
          and (ro.snooze_until is null or ro.snooze_until <= now())
        order by ro.scheduled_for asc
        limit 1
      )`,
      pendingOccurrences: sql<number>`coalesce(${occurrenceCounts.pendingOccurrences},0)`,
      completedOccurrences: sql<number>`coalesce(${occurrenceCounts.completedOccurrences},0)`,
      skippedOccurrences: sql<number>`coalesce(${occurrenceCounts.skippedOccurrences},0)`,
      expiredOccurrences: sql<number>`coalesce(${occurrenceCounts.expiredOccurrences},0)`,

      lastResolvedStatus: sql<"completed" | "skipped" | null>`(
        select ro.status
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
        order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
        limit 1
      )`,

      lastResolvedAt: sql<Date | null>`(
        select coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for)
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
        order by coalesce(ro.completed_at, ro.triggered_at, ro.scheduled_for) desc
        limit 1
      )`,
      lastCompletedAt: sql<Date | null>`(
        select ro.completed_at
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'completed'
        order by ro.completed_at desc
        limit 1
      )`,
      lastScheduledFor: sql<Date | null>`(
        select ro.scheduled_for
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
        order by ro.scheduled_for desc
        limit 1
      )`,
      snoozedUntil: sql<Date | null>`(
        select ro.snooze_until
        from reminder_occurrences ro
        where ro.reminder_id = ${reminders.id}
          and ro.status = 'pending'
          and ro.snooze_until > now()
        order by ro.snooze_until desc
        limit 1
      )`,
    })
    .from(reminders)
    .leftJoin(occurrenceCounts, eq(occurrenceCounts.reminderId, reminders.id))
    .where(whereClause)
    .orderBy(desc(reminders.createdAt));

  const now = new Date();

  return data.map((r): ReminderDTO => {
    let nextScheduleAt = r.nextUpcomingAt;

    if (!nextScheduleAt && r.scheduleType === "one-time") {
      nextScheduleAt =
        r.status === "active" && r.remindAt > now ? r.remindAt : null;
    }

    if (!nextScheduleAt && r.scheduleType === "interval" && r.repeatIntervalMinutes) {
      const ms = r.repeatIntervalMinutes * 60000;
      const next = new Date(
        new Date(r.remindAt).getTime() +
        Math.ceil((Date.now() - new Date(r.remindAt).getTime()) / ms) * ms
      );
      nextScheduleAt = next;
    }

    if (!nextScheduleAt && r.scheduleType === "recurring") {
      try {
        const iter = CronExpressionParser.parse(
          resolveRecurringCronExpressionFromReminder({
            cronExpression: r.cronExpression,
            remindAt: new Date(r.remindAt),
            tags: r.tags,
          }),
          { currentDate: now, tz: babyTimezone }
        );
        nextScheduleAt = iter.next().toDate();
      } catch { }
    }

    return {
      ...r,
      nextScheduleAt,
      tags: (r.tags ?? null) as Record<string, unknown> | null,
    };
  });
}