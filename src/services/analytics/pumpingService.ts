import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";

/* ---------------- Metadata ---------------- */

export type PumpSide = "left" | "right" | "both";

export type PumpComfort =
  | "comfortable"
  | "neutral"
  | "painful";

export type PumpingMetadata = {
  side?: PumpSide;
  amountMl?: number;
  durationMinutes?: number;
  comfort?: PumpComfort;
  unit?: "ml" | "oz";
  notes?: string;
};

/* ---------------- Result Types ---------------- */

export type PumpingAnalyticsResult = {
  summary: {
    totalSessions: number;
    totalAmountMl: number;
    avgAmountPerSessionMl: number;
    avgDurationMinutes: number;
    mostCommonSide: PumpSide | null;
    mostCommonHour: number | null;
    painRatioPercent: number;
  };

  distributions: {
    side: Record<string, number>;
    hourOfDay: Record<number, number>;
  };

  daily: {
    date: string;
    sessions: number;
    totalAmount: number;
  }[];
};

/* ---------------- Helpers ---------------- */

function safeMetadata(meta: unknown): PumpingMetadata | null {
  if (!meta || typeof meta !== "object") return null;
  return meta as PumpingMetadata;
}

function increment(map: Record<string, number>, key?: string | number | null) {
  if (key === undefined || key === null) return;
  const k = String(key);
  map[k] = (map[k] ?? 0) + 1;
}

function mostCommon(map: Record<string, number>): string | null {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function mostCommonHour(map: Record<number, number>): number | null {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  return Number(entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0][0]);
}

function dateKeyUTC(value: Date) {
  return value.toISOString().slice(0, 10);
}

/* ---------------- Service ---------------- */

export async function getPumpingAnalytics(params: {
  babyId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<PumpingAnalyticsResult> {

  const { babyId, startDate, endDate } = params;

  const conditions = [
    eq(activityTypes.slug, "pumping"),
    eq(activities.babyId, babyId),
  ];

  if (startDate) {
    conditions.push(gte(activities.startTime, startDate));
  }

  if (endDate) {
    conditions.push(lte(activities.startTime, endDate));
  }

  const rows = await db
    .select({
      metadata: activities.metadata,
      durationMinutes: activities.durationMinutes,
      startTime: activities.startTime,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(and(...conditions));

  let totalSessions = 0;
  let totalAmount = 0;
  let totalDuration = 0;
  let painfulSessions = 0;

  const side: Record<string, number> = {};
  const hourOfDay: Record<number, number> = {};
  const dailyAmount: Record<string, number> = {};
  const dailySessions: Record<string, number> = {};

  for (const row of rows) {

    totalSessions++;

    const hour = new Date(row.startTime).getHours();
    hourOfDay[hour] = (hourOfDay[hour] ?? 0) + 1;

    const key = dateKeyUTC(new Date(row.startTime));
    dailySessions[key] = (dailySessions[key] ?? 0) + 1;

    const meta = safeMetadata(row.metadata);
    if (!meta) continue;

    const amount = typeof meta.amountMl === "number" ? meta.amountMl : 0;
    const duration =
      typeof meta.durationMinutes === "number"
        ? meta.durationMinutes
        : row.durationMinutes ?? 0;

    totalAmount += amount;
    totalDuration += duration;

    dailyAmount[key] = (dailyAmount[key] ?? 0) + amount;

    increment(side, meta.side);

    if (meta.comfort === "painful") {
      painfulSessions++;
    }
  }

  const avgAmount =
    totalSessions > 0 ? Math.round(totalAmount / totalSessions) : 0;

  const avgDuration =
    totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

  const painRatioPercent =
    totalSessions > 0
      ? Math.round((painfulSessions / totalSessions) * 1000) / 10
      : 0;

  const daily = Object.keys(dailySessions)
    .map((date) => ({
      date,
      sessions: dailySessions[date],
      totalAmount: dailyAmount[date] ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalSessions,
      totalAmountMl: Math.round(totalAmount),
      avgAmountPerSessionMl: avgAmount,
      avgDurationMinutes: avgDuration,
      mostCommonSide: mostCommon(side) as PumpSide | null,
      mostCommonHour: mostCommonHour(hourOfDay),
      painRatioPercent,
    },

    distributions: {
      side,
      hourOfDay,
    },

    daily,
  };
}