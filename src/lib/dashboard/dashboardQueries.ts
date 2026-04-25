import { db } from "@/lib/db";
import {
  babies,
  activities,
  reminders,
  reminderOccurrences,
  activityTypes,
} from "@/lib/db/schema";
import { eq, desc, gte, and, asc } from "drizzle-orm";

export async function getUserBabies(userId: string) {
  return db
    .select({ id: babies.id, name: babies.name })
    .from(babies)
    .where(eq(babies.userId, userId))
    .limit(50);
}


export async function getRecentActivities(babyId: string) {
  return db
    .select({
      id: activities.id,
      startTime: activities.startTime,
      endTime: activities.endTime,
      type: activityTypes.name,
      slug: activityTypes.slug,
      metadata: activities.metadata,
      notes: activities.notes,
      duration: activities.durationMinutes,
    })
    .from(activities)
    .innerJoin(
      activityTypes,
      eq(activityTypes.id, activities.activityTypeId)
    )
    .where(eq(activities.babyId, babyId))
    .orderBy(desc(activities.startTime))
    .limit(5);
}
export async function getUpcomingReminders(babyId: string) {
  const now = new Date();

  return db
    .select({
      id: reminderOccurrences.id,
      title: reminders.title,
      remindAt: reminderOccurrences.scheduledFor,
    })
    .from(reminderOccurrences)
    .innerJoin(
      reminders,
      eq(reminders.id, reminderOccurrences.reminderId)
    )
    .where(
      and(
        eq(reminders.babyId, babyId),
        eq(reminders.status, "active"),
        gte(reminderOccurrences.scheduledFor, now),
        eq(reminderOccurrences.status, "pending")
      )
    )
    .orderBy(asc(reminderOccurrences.scheduledFor))
    .limit(5);
}

// ✅ ADD THIS BACK
export async function getTodayActivities(babyId: string, todayStart: Date) {
  return db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        gte(activities.startTime, todayStart)
      )
    );
}