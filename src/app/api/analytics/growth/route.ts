import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activityTypes, babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  fetchGrowthMeasurements,
  computeGrowthAnalytics,
} from "@/lib/utils/analytics/growth";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(60).optional(),
});


export async function GET(req: Request) {
  try {
    /* ---------------- Auth ---------------- */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ---------------- Query Validation ---------------- */
    const url = new URL(req.url);

    const parsed = querySchema.safeParse({
      babyId: url.searchParams.get("babyId"),
      days: url.searchParams.get("days") ?? undefined,
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

    /* ---------------- Get Growth Activity Type ---------------- */
    const growthTypeResult = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.slug, "growth")) // use slug like feeding
      .limit(1);

    if (!growthTypeResult.length) {
      return NextResponse.json(
        { error: "Growth activity type missing" },
        { status: 500 }
      );
    }

    const growthTypeId = growthTypeResult[0].id;

    /* ---------------- Date Range ---------------- */
    const now = new Date();

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    if (typeof days === "number") {
      startDate.setDate(startDate.getDate() - (days - 1));
    } else {
      startDate.setTime(0);
    }

    /* ---------------- Fetch & Filter Measurements ---------------- */
    const rawRows = await fetchGrowthMeasurements(
      babyId,
      growthTypeId
    );

    const filteredRows = rawRows.filter((row) => {
      const t = new Date(row.date).getTime();
      return typeof days === "number"
        ? t >= startDate.getTime() &&
        t <= now.getTime()
        : t <= now.getTime();
    });

    /* ---------------- Empty Case ---------------- */
    if (!filteredRows.length) {
      return NextResponse.json({
        records: [],
        summary: null,
      });
    }

    /* ---------------- Analytics Engine ---------------- */
    const records = computeGrowthAnalytics(filteredRows);

    const latest = records[records.length - 1];
    const first = records.find(r => r.weight !== null);
    const last = [...records].reverse().find(r => r.weight !== null);

    let totalWeightGain: number | null = null;
    let avgWeeklyGain: number | null = null;
    let heightGrowthPerMonth: number | null = null;
    let headGrowthPerMonth: number | null = null;
    let daysSinceLastMeasurement: number | null = null;
    let trend: string | null = null;

    if (first && last && first.weight !== null && last.weight !== null) {
      totalWeightGain = last.weight - first.weight;

      const totalDays =
        (last.date.getTime() - first.date.getTime()) /
        (1000 * 60 * 60 * 24);

      if (totalDays > 0) {
        avgWeeklyGain = (totalWeightGain / totalDays) * 7;
      }
    }

    /* Height Rate */
    const firstHeight = records.find(r => r.height !== null);
    const lastHeight = [...records]
      .reverse()
      .find(r => r.height !== null);

    if (
      firstHeight &&
      lastHeight &&
      firstHeight.height !== null &&
      lastHeight.height !== null
    ) {
      const heightGain =
        lastHeight.height - firstHeight.height;

      const totalDays =
        (lastHeight.date.getTime() -
          firstHeight.date.getTime()) /
        (1000 * 60 * 60 * 24);

      if (totalDays > 0) {
        heightGrowthPerMonth =
          (heightGain / totalDays) * 30;
      }
    }


    /* Head Rate */
    const firstHead = records.find(
      r => r.headCircumference !== null
    );

    const lastHead = [...records]
      .reverse()
      .find(r => r.headCircumference !== null);

    if (
      firstHead &&
      lastHead &&
      firstHead.headCircumference !== null &&
      lastHead.headCircumference !== null
    ) {
      const headGain =
        lastHead.headCircumference -
        firstHead.headCircumference;

      const totalDays =
        (lastHead.date.getTime() -
          firstHead.date.getTime()) /
        (1000 * 60 * 60 * 24);

      if (totalDays > 0) {
        headGrowthPerMonth =
          (headGain / totalDays) * 30;
      }
    }


    /* Days Since Last Measurement */
    if (latest?.date) {
      daysSinceLastMeasurement = Math.floor(
        (Date.now() - latest.date.getTime()) /
        (1000 * 60 * 60 * 24)
      );
    }

    /* Trend Detection */
    if (avgWeeklyGain !== null) {
      if (avgWeeklyGain > 0.15) trend = "Healthy upward growth 📈";
      else if (avgWeeklyGain > 0) trend = "Slow but positive growth ↗";
      else trend = "Growth plateau detected ⚠️";
    }


    /* ---------------- Response ---------------- */
    return NextResponse.json(
      {
        records,
        summary: {
          latestWeight: latest?.weight ?? null,
          latestHeight: latest?.height ?? null,
          latestHead: latest?.headCircumference ?? null,
          totalWeightGain,
          avgWeeklyGain,
          heightGrowthPerMonth,
          headGrowthPerMonth,
          daysSinceLastMeasurement,
          trend,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (err) {
    console.error("Growth analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
