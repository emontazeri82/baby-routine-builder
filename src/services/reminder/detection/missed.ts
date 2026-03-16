import { subDays, subHours } from "date-fns";
import { and, eq, gt, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { babies, reminderOccurrences, reminders } from "@/lib/db/schema";

async function verifyBabyOwnership(babyId: string, userId: string) {
  const baby = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, userId)))
    .limit(1);

  if (!baby.length) throw new Error("Unauthorized baby access");
}

function overdueBaseWhere(babyId: string, from: Date, to: Date) {
  return and(
    eq(reminders.babyId, babyId),
    eq(reminders.status, "active"),
    eq(reminderOccurrences.status, "pending"),
    gte(reminderOccurrences.scheduledFor, from),
    lt(reminderOccurrences.scheduledFor, to)
  );
}

export async function getRecentlyOverdueReminders(
  babyId: string,
  userId: string,
  windowHours = 2
) {
  await verifyBabyOwnership(babyId, userId);

  const now = new Date();
  const windowStart = subHours(now, windowHours);

  return db
    .select({
      id: reminderOccurrences.id,
      reminderId: reminderOccurrences.reminderId,
      scheduledFor: reminderOccurrences.scheduledFor,
      title: reminders.title,
    })
    .from(reminderOccurrences)
    .innerJoin(
      reminders,
      eq(reminderOccurrences.reminderId, reminders.id)
    )
    .where(overdueBaseWhere(babyId, windowStart, now));
}

export async function getMissedCountLast7Days(
  babyId: string,
  userId: string
) {
  await verifyBabyOwnership(babyId, userId);

  const now = new Date();
  const weekAgo = subDays(now, 7);

  const rows = await db
    .select({ id: reminderOccurrences.id })
    .from(reminderOccurrences)
    .innerJoin(
      reminders,
      eq(reminderOccurrences.reminderId, reminders.id)
    )
    .where(overdueBaseWhere(babyId, weekAgo, now));

  return rows.length;
}

export async function getMissedReminders(
  babyId: string,
  userId: string
) {
  await verifyBabyOwnership(babyId, userId);

  const now = new Date();
  const monthAgo = subDays(now, 30);

  return db
    .select({
      id: reminderOccurrences.id,
      reminderId: reminderOccurrences.reminderId,
      scheduledFor: reminderOccurrences.scheduledFor,
      title: reminders.title,
      scheduleType: reminders.scheduleType,
    })
    .from(reminderOccurrences)
    .innerJoin(
      reminders,
      eq(reminderOccurrences.reminderId, reminders.id)
    )
    .where(overdueBaseWhere(babyId, monthAgo, now));
}

