import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import {
  eq,
  and,
  gte,
  lte,
  asc,
} from "drizzle-orm";
import { calculateFeedingAnalytics } from "@/lib/utils/analytics/feeding";
import { cache } from "react";
import { withAnalyticsCache } from "@/lib/cache/analyticsCache";

async function computeFeedingSummary(babyId: string, days: number) {
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
        lte(activities.startTime, now)
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
    const lastFeedAt = new Date(lastFeed.endTime ?? lastFeed.startTime);
    const minutesSinceLastFeed =
      (Date.now() - lastFeedAt.getTime()) / 60000;

    predictedNextFeedInMinutes = Math.max(
      0,
      avgInterval - minutesSinceLastFeed
    );
  }

  analytics.summary.predictedNextFeedInMinutes =
    predictedNextFeedInMinutes;

  return analytics.summary;
}

export const getFeedingSummary = cache(async (
  babyId: string,
  days: number = 7
) => {
  return withAnalyticsCache({
    babyId,
    scope: "feeding-service-summary",
    parts: [days],
    ttlSeconds: 120,
    loader: () => computeFeedingSummary(babyId, days),
  });
});
