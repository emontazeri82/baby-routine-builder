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
import { redis } from "@/lib/redis";

export const getFeedingSummary = cache(async (
  babyId: string,
  days: number = 7
) => {
  const key = `feeding:${babyId}:${days}`;

  try {
    // 🔥 1. Check Redis cache
    const cached = await redis.get(key);
    if (cached) {
      console.log("✅ Redis HIT:", key);
      return cached;
    }

    console.log("❌ Redis MISS:", key);

    // 🔽 ORIGINAL LOGIC (UNCHANGED)
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

    const result = analytics.summary;

    // 🔥 2. Save to Redis
    await redis.set(key, result, {
      ex: 60 * 5, // 5 minutes
    });

    return result;

  } catch (err) {
    console.error("Redis error (fallback to DB):", err);

    // 🔁 fallback (original logic again, safe)
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

    return analytics.summary;
  }
});