import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

export type NapLocation = "crib" | "stroller" | "car" | "parent";
export type NapQuality = "good" | "fair" | "poor";

export interface NapMetadata {
  location?: NapLocation;
  quality?: NapQuality;
  assisted?: boolean;
  notes?: string;
}

export interface NapActivity {
  id: string;
  startTime: Date;
  endTime: Date | null;
  metadata?: NapMetadata;
}

export interface NapDailySummary {
  date: string;
  naps: number;
  assisted: number;
  totalMinutes: number;
}

export interface NapSummary {
  totalNaps: number;
  avgNapsPerDay: number;
  assistedCount: number;
  assistedRatioPercent: number;
  totalNapMinutes: number;
  avgNapDurationMinutes: number;
  longestNapMinutes: number;
  shortestNapMinutes: number;
  napSessionCount: number;
  consistencyScore: number;
  bestNapDay: string | null;
  worstNapDay: string | null;
  mostCommonStartHour: number | null;
  mostCommonLocation: NapLocation | null;
  mostCommonQuality: NapQuality | null;
  timezone?: string;
}

export class NapService {

  /* ---------------- DURATION ---------------- */

  static getDurationMinutes(activity: NapActivity): number | null {
    if (!activity.endTime) return null;

    const start = new Date(activity.startTime).getTime();
    const end = new Date(activity.endTime).getTime();

    const diff = Math.max(0, end - start);

    return Math.round(diff / 60000);
  }

  /* ---------------- DAILY AGGREGATION ---------------- */

  static buildDailySummary(
    activities: NapActivity[]
  ): NapDailySummary[] {

    const map = new Map<string, NapDailySummary>();

    for (const activity of activities) {
      const date = activity.startTime
        .toISOString()
        .slice(0, 10);

      if (!map.has(date)) {
        map.set(date, {
          date,
          naps: 0,
          assisted: 0,
          totalMinutes: 0,
        });
      }

      const day = map.get(date)!;

      day.naps++;

      if (activity.metadata?.assisted) {
        day.assisted++;
      }

      const duration = NapService.getDurationMinutes(activity);
      if (duration !== null) {
        day.totalMinutes += duration;
      }
    }

    return Array.from(map.values());
  }

  /* ---------------- SUMMARY ---------------- */

  static buildSummary(
    activities: NapActivity[],
    days: number,
    daily: NapDailySummary[],
    timezone?: string
  ): NapSummary {

    const totalNaps = activities.length;

    let assistedCount = 0;
    let totalNapMinutes = 0;
    let durationSamples = 0;
    let longestNapMinutes = 0;
    let shortestNapMinutes = Number.POSITIVE_INFINITY;

    const locationCount: Record<string, number> = {};
    const qualityCount: Record<string, number> = {};
    const startHourCount: Record<number, number> = {};

    for (const activity of activities) {
      const meta = activity.metadata ?? {};

      if (meta.assisted) assistedCount++;

      const duration = NapService.getDurationMinutes(activity);
      if (duration !== null) {
        totalNapMinutes += duration;
        durationSamples += 1;
        longestNapMinutes = Math.max(longestNapMinutes, duration);
        shortestNapMinutes = Math.min(shortestNapMinutes, duration);
      }

      if (meta.location) {
        locationCount[meta.location] =
          (locationCount[meta.location] ?? 0) + 1;
      }

      if (meta.quality) {
        qualityCount[meta.quality] =
          (qualityCount[meta.quality] ?? 0) + 1;
      }

      const start = new Date(activity.startTime);
      const hour = timezone
        ? Number(
            new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "2-digit",
              hour12: false,
            })
              .formatToParts(start)
              .find((p) => p.type === "hour")?.value ?? "0"
          )
        : start.getHours();
      startHourCount[hour] = (startHourCount[hour] ?? 0) + 1;
    }

    const mostCommon = (
      map: Record<string, number>
    ): string | null => {
      const entries = Object.entries(map);

      if (!entries.length) return null;

      return entries.sort((a, b) => b[1] - a[1])[0][0];
    };

    const avgNapDurationMinutes =
      durationSamples > 0 ? totalNapMinutes / durationSamples : 0;

    const meanDailyMinutes =
      daily.length > 0
        ? daily.reduce((acc, d) => acc + d.totalMinutes, 0) / daily.length
        : 0;
    const variance =
      daily.reduce(
        (acc, d) => acc + Math.pow(d.totalMinutes - meanDailyMinutes, 2),
        0
      ) / Math.max(1, daily.length);
    const consistencyScore = Math.max(0, 100 - Math.sqrt(variance) / 10);

    const bestNapDay =
      daily.length > 0
        ? [...daily].sort((a, b) => b.totalMinutes - a.totalMinutes)[0].date
        : null;
    const worstNapDay =
      daily.length > 0
        ? [...daily].sort((a, b) => a.totalMinutes - b.totalMinutes)[0].date
        : null;

    const mostCommonHourRaw = Object.entries(startHourCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return {
      totalNaps,
      avgNapsPerDay: totalNaps / days,
      assistedCount,
      assistedRatioPercent:
        totalNaps > 0
          ? (assistedCount / totalNaps) * 100
          : 0,
      totalNapMinutes,
      avgNapDurationMinutes,
      longestNapMinutes,
      shortestNapMinutes:
        shortestNapMinutes === Number.POSITIVE_INFINITY
          ? 0
          : shortestNapMinutes,
      napSessionCount: totalNaps,
      consistencyScore,
      bestNapDay,
      worstNapDay,
      mostCommonStartHour:
        typeof mostCommonHourRaw === "string" ? Number(mostCommonHourRaw) : null,
      mostCommonLocation:
        mostCommon(locationCount) as NapLocation | null,
      mostCommonQuality:
        mostCommon(qualityCount) as NapQuality | null,
      timezone,
    };
  }

  /* ---------------- PATTERN DETECTION ---------------- */

  static detectAssistedPattern(
    activities: NapActivity[]
  ): boolean {

    if (!activities.length) return false;

    const assistedCount = activities.filter(
      a => a.metadata?.assisted
    ).length;

    const ratio = assistedCount / activities.length;

    return ratio > 0.6;
  }

  /* ---------------- QUALITY SCORE ---------------- */

  static calculateQualityScore(
    activities: NapActivity[]
  ): number {

    if (!activities.length) return 0;

    const scoreMap: Record<NapQuality, number> = {
      good: 100,
      fair: 60,
      poor: 30,
    };

    let total = 0;
    let count = 0;

    for (const activity of activities) {
      const q = activity.metadata?.quality;

      if (!q) continue;

      total += scoreMap[q];
      count++;
    }

    if (count === 0) return 0;

    return Math.round(total / count);
  }
}

type GetNapAnalyticsParams = {
  babyId: string;
  startDate: Date;
  endDate: Date;
};

export async function getNapAnalytics({
  babyId,
  startDate,
  endDate,
}: GetNapAnalyticsParams) {
  const baby = await db
    .select({ timezone: babies.timezone })
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);
  const timezone = baby[0]?.timezone ?? "UTC";

  const rows = await db
    .select({
      id: activities.id,
      startTime: activities.startTime,
      endTime: activities.endTime,
      metadata: activities.metadata,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activityTypes.slug, "nap"),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      )
    );

  const activitiesData: NapActivity[] = rows.map((row) => ({
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    metadata: (row.metadata as NapMetadata | null) ?? undefined,
  }));

  const days = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  const wallEnd = (() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(endDate);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0));
  })();

  const orderedRangeKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(wallEnd);
    d.setUTCDate(d.getUTCDate() - i);
    orderedRangeKeys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`
    );
  }

  return {
    daily: orderedRangeKeys.map((dateKey) => {
      const day =
        NapService.buildDailySummary(activitiesData).find((d) => d.date === dateKey) ??
        ({
          date: dateKey,
          naps: 0,
          assisted: 0,
          totalMinutes: 0,
        } as NapDailySummary);
      return day;
    }),
    summary: (() => {
      const daily = orderedRangeKeys.map((dateKey) =>
        NapService.buildDailySummary(activitiesData).find((d) => d.date === dateKey) ??
        ({
          date: dateKey,
          naps: 0,
          assisted: 0,
          totalMinutes: 0,
        } as NapDailySummary)
      );
      return NapService.buildSummary(activitiesData, days, daily, timezone);
    })(),
  };
}
