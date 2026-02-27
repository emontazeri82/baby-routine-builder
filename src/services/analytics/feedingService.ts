import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import {
  eq,
  and,
  gte,
  lte,
  isNotNull,
  asc,
} from "drizzle-orm";
import { calculateFeedingAnalytics } from "@/lib/utils/analytics/feeding";

export async function getFeedingSummary(
  babyId: string,
  days: number = 7
) {
  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  if (!baby.length) return null;

  const feedingType = await db
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.slug, "feeding"))
    .limit(1);

  if (!feedingType.length) return null;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - (days - 1));

  const records = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activities.activityTypeId, feedingType[0].id),
        gte(activities.startTime, startDate),
        lte(activities.startTime, now),
        isNotNull(activities.endTime)
      )
    )
    .orderBy(asc(activities.startTime));

  if (!records.length) return null;

  const analytics = calculateFeedingAnalytics(
    records,
    baby[0].timezone || "UTC",
    { rangeDays: days, rangeEnd: now }
  );

  let predictedNextFeedInMinutes: number | null = null;
  const avgInterval = analytics.summary.avgIntervalMinutes;

  if (avgInterval && records.length > 0) {
    const lastFeed = records[records.length - 1];
    const lastEnd = new Date(lastFeed.endTime!);
    const minutesSinceLastFeed =
      (Date.now() - lastEnd.getTime()) / 60000;

    predictedNextFeedInMinutes = Math.max(
      0,
      avgInterval - minutesSinceLastFeed
    );
  }

  analytics.summary.predictedNextFeedInMinutes =
    predictedNextFeedInMinutes;

  return analytics.summary;
}
