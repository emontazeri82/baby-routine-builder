import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { calculateFeedingAnalytics } from "@/lib/utils/analytics/feeding";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().min(1).max(60).default(7),
});

export async function GET(req: Request) {
  try {
    /* ---------------- Auth ---------------- */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------------- Query Validation ---------------- */
    const url = new URL(req.url);

    const parsed = querySchema.safeParse({
      babyId: url.searchParams.get("babyId"),
      days: url.searchParams.get("days"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { babyId, days } = parsed.data;

    /* ---------------- Verify Baby Ownership ---------------- */
    const babyResult = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);

    if (
      !babyResult.length ||
      babyResult[0].userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const baby = babyResult[0];

    /* ---------------- Get Feeding Activity Type (use slug if exists) ---------------- */
    const feedingTypeResult = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.slug, "feeding")) // safer than name
      .limit(1);

    if (!feedingTypeResult.length) {
      return NextResponse.json(
        { error: "Feeding activity type missing" },
        { status: 500 }
      );
    }

    const feedingTypeId = feedingTypeResult[0].id;

    /* ---------------- Date Range (Full Calendar Days) ---------------- */
    const now = new Date();

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    /* ---------------- Fetch Records ---------------- */
    const records = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activities.activityTypeId, feedingTypeId),
          gte(activities.startTime, startDate),
          lte(activities.startTime, now)
        )
      )
      .orderBy(activities.startTime);

    /* ---------------- Empty Case ---------------- */
    if (!records.length) {
      return NextResponse.json({
        daily: [],
        summary: {
          totalFeeds: 0,
          avgFeedsPerDay: 0,
          feedsPerDayStdDev: 0,
          avgIntervalMinutes: 0,
          intervalStdDev: 0,
          longestGapMinutes: 0,
          shortestIntervalMinutes: 0,
          avgFeedDurationMinutes: 0,
          longestFeedMinutes: 0,
          shortestFeedMinutes: 0,
          totalIntakeMl: 0,
          avgIntakePerFeedMl: 0,
          avgIntakePerDayMl: 0,
          nightFeedsCount: 0,
          nightFeedRatioPercent: 0,
          nightIntakeMl: 0,
          feedingConsistencyScore: 0,
          clusterFeedingDetected: false,
          predictedNextFeedInMinutes: null,
        },
      });
    }

    /* ---------------- Analytics Engine ---------------- */
    const analytics = calculateFeedingAnalytics(
      records,
      baby.timezone || "UTC",
      { rangeDays: days, rangeEnd: now }
    );

    /* ---------------- Predict Next Feed ---------------- */
    let predictedNextFeedInMinutes: number | null = null;

    const avgInterval = analytics.summary.avgIntervalMinutes;

    if (avgInterval && records.length > 0) {
      const lastFeed = records[records.length - 1];
      const lastFeedAt = new Date(lastFeed.endTime ?? lastFeed.startTime);

      const minutesSinceLastFeed =
        (Date.now() - lastFeedAt.getTime()) / 60000;

      predictedNextFeedInMinutes =
        avgInterval - minutesSinceLastFeed;

      if (predictedNextFeedInMinutes < 0) {
        predictedNextFeedInMinutes = 0;
      }
    }

    analytics.summary.predictedNextFeedInMinutes =
      predictedNextFeedInMinutes;

    /* ---------------- Response ---------------- */
    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    console.error("Feeding analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
