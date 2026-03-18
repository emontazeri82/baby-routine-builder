import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function getSleepSummary(
  babyId: string,
  days: number = 7
) {
  const sleepType = await db
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.slug, "sleep"))
    .limit(1);

  if (!sleepType.length) return null;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - (days - 1));

  const records = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activities.activityTypeId, sleepType[0].id),
        gte(activities.startTime, startDate),
        lte(activities.startTime, now)
      )
    );

  if (!records.length) return null;

  const totalMinutes = records.reduce((sum, r) => {
    const start = new Date(r.startTime);
    const explicitEnd = r.endTime ? new Date(r.endTime) : null;
    const fallbackDuration =
      typeof r.durationMinutes === "number" && Number.isFinite(r.durationMinutes)
        ? r.durationMinutes
        : null;
    const end =
      explicitEnd ??
      (fallbackDuration !== null
        ? new Date(start.getTime() + fallbackDuration * 60000)
        : null);

    if (!end) return sum;

    return sum + Math.max(0, (end.getTime() - start.getTime()) / 60000);
  }, 0);

  const avgDailyMinutes = totalMinutes / days;

  return {
    avgDailyMinutes,
    consistencyScore: 80, // replace later with real one
  };
}
