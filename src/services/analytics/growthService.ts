
import { db } from "@/lib/db";
import { activityTypes, babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchGrowthMeasurements,
  computeGrowthAnalytics,
} from "@/lib/utils/analytics/growth";

export async function getGrowthSummary(
  babyId: string,
  days?: number
) {
  const growthType = await db
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.slug, "growth"))
    .limit(1);

  if (!growthType.length) return null;

  const rawRows = await fetchGrowthMeasurements(
    babyId,
    growthType[0].id
  );

  if (!rawRows.length) return null;

  const records = computeGrowthAnalytics(rawRows);

  const latest = records[records.length - 1];
  const first = records.find(r => r.weight !== null);
  const last = [...records].reverse().find(r => r.weight !== null);

  let avgWeeklyGain: number | null = null;
  let daysSinceLastMeasurement: number | null = null;

  if (first && last && first.weight !== null && last.weight !== null) {
    const totalGain = last.weight - first.weight;
    const totalDays =
      (last.date.getTime() - first.date.getTime()) /
      (1000 * 60 * 60 * 24);

    if (totalDays > 0) {
      avgWeeklyGain = (totalGain / totalDays) * 7;
    }
  }

  if (latest?.date) {
    daysSinceLastMeasurement = Math.floor(
      (Date.now() - latest.date.getTime()) /
      (1000 * 60 * 60 * 24)
    );
  }

  return {
    avgWeeklyGain,
    daysSinceLastMeasurement,
    trend: avgWeeklyGain
      ? avgWeeklyGain > 0.15
        ? "Healthy upward growth"
        : avgWeeklyGain > 0
        ? "Slow but positive growth"
        : "Growth plateau"
      : null,
  };
}
