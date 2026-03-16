import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies, activities, activityTypes } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const babyId = searchParams.get("babyId");
    const days = Number(searchParams.get("days") ?? 7);

    if (!babyId) {
      return NextResponse.json(
        { error: "Missing babyId" },
        { status: 400 }
      );
    }

    /* ---------------- VERIFY BABY OWNERSHIP ---------------- */

    const baby = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);

    if (!baby.length || baby[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ---------------- DATE RANGE ---------------- */

    const startDate = startOfDay(subDays(new Date(), days - 1));

    /* ---------------- FETCH ACTIVITIES ---------------- */

    const napActivities = await db
      .select()
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activityTypes.slug, "nap"),
          gte(activities.startTime, startDate)
        )
      );

    /* ---------------- DAILY AGGREGATION ---------------- */

    const dailyMap = new Map<
      string,
      {
        count: number;
        assisted: number;
        locations: Record<string, number>;
        qualities: Record<string, number>;
      }
    >();

    for (const row of napActivities) {
      const activity = row.activities;
      const date = format(activity.startTime, "yyyy-MM-dd");

      const metadata = (activity.metadata ?? {}) as any;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          count: 0,
          assisted: 0,
          locations: {},
          qualities: {},
        });
      }

      const day = dailyMap.get(date)!;

      day.count++;

      if (metadata.assisted) {
        day.assisted++;
      }

      if (metadata.location) {
        day.locations[metadata.location] =
          (day.locations[metadata.location] ?? 0) + 1;
      }

      if (metadata.quality) {
        day.qualities[metadata.quality] =
          (day.qualities[metadata.quality] ?? 0) + 1;
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      naps: data.count,
      assisted: data.assisted,
    }));

    /* ---------------- SUMMARY METRICS ---------------- */

    const napRows = napActivities.map((row) => row.activities);
    const totalNaps = napRows.length;

    const assistedCount = napRows.filter(
      (a) => (a.metadata as any)?.assisted
    ).length;

    const assistedRatio =
      totalNaps > 0 ? (assistedCount / totalNaps) * 100 : 0;

    const locationCount: Record<string, number> = {};
    const qualityCount: Record<string, number> = {};

    for (const activity of napRows) {
      const metadata = (activity.metadata ?? {}) as any;

      if (metadata.location) {
        locationCount[metadata.location] =
          (locationCount[metadata.location] ?? 0) + 1;
      }

      if (metadata.quality) {
        qualityCount[metadata.quality] =
          (qualityCount[metadata.quality] ?? 0) + 1;
      }
    }

    function mostCommon(map: Record<string, number>) {
      const entries = Object.entries(map);
      if (!entries.length) return null;
      return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    const summary = {
      totalNaps,
      avgNapsPerDay: totalNaps / days,
      assistedCount,
      assistedRatioPercent: assistedRatio,
      mostCommonLocation: mostCommon(locationCount),
      mostCommonQuality: mostCommon(qualityCount),
    };

    /* ---------------- RESPONSE ---------------- */

    return NextResponse.json({
      daily,
      summary,
    });
  } catch (error) {
    console.error("Nap analytics error:", error);

    return NextResponse.json(
      { error: "Failed to compute nap analytics" },
      { status: 500 }
    );
  }
}
