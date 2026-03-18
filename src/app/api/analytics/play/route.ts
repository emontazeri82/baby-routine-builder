import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(60).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

type PlayMetadata = {
  playType?: string;
  activityType?: string;
  location?: string;
  intensity?: string;
  mood?: string;
  skills?: string[];
};

function safeMetadata(meta: unknown): PlayMetadata | null {
  if (!meta || typeof meta !== "object") return null;
  return meta as PlayMetadata;
}

function increment(map: Record<string, number>, key?: string) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function dateKeyUTC(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);

  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    days: url.searchParams.get("days") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { status: "error", message: "Invalid play analytics query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { babyId, days, start, end } = parsed.data;

  const owned = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!owned.length) {
    return NextResponse.json(
      { status: "error", message: "Forbidden" },
      { status: 403 }
    );
  }

  const conditions = [
    eq(activityTypes.slug, "play"),
    eq(activities.babyId, babyId),
  ];
  const now = new Date();
  const resolvedStart =
    start
      ? new Date(start)
      : typeof days === "number"
        ? (() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (days - 1));
            return d;
          })()
        : null;
  const resolvedEnd = end ? new Date(end) : now;

  if (resolvedStart) {
    conditions.push(gte(activities.startTime, resolvedStart));
  }
  if (resolvedEnd) {
    conditions.push(lte(activities.startTime, resolvedEnd));
  }

  const rows = await db
    .select({
      metadata: activities.metadata,
      durationMinutes: activities.durationMinutes,
      startTime: activities.startTime,
      endTime: activities.endTime,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(and(...conditions));

  let totalSessions = 0;
  let totalMinutes = 0;
  let durationSessions = 0;
  let longestSessionMinutes = 0;
  let shortestSessionMinutes = Number.POSITIVE_INFINITY;
  let outdoorSessions = 0;
  let activeIntensitySessions = 0;
  let happyMoodSessions = 0;

  const playTypeCount: Record<string, number> = {};
  const locationCount: Record<string, number> = {};
  const moodCount: Record<string, number> = {};
  const skillCount: Record<string, number> = {};
  const intensityCount: Record<string, number> = {};

  const hourDistribution: Record<number, number> = {};
  const dailyByDate: Record<string, { sessions: number; totalMinutes: number }> = {};
  const uniquePlayTypes = new Set<string>();
  const uniqueSkills = new Set<string>();
  const activeDates = new Set<string>();
  let totalSkillSelections = 0;

  for (const row of rows) {
    totalSessions++;

    const duration =
      row.durationMinutes ??
      (row.endTime
        ? Math.max(
            0,
            Math.round(
              (new Date(row.endTime).getTime() - new Date(row.startTime).getTime()) /
                60000
            )
          )
        : null);

    if (typeof duration === "number") {
      totalMinutes += duration;
      durationSessions += 1;
      longestSessionMinutes = Math.max(longestSessionMinutes, duration);
      if (duration > 0) {
        shortestSessionMinutes = Math.min(shortestSessionMinutes, duration);
      }
    }

    const hour = new Date(row.startTime).getHours();
    hourDistribution[hour] = (hourDistribution[hour] ?? 0) + 1;
    const key = dateKeyUTC(new Date(row.startTime));
    dailyByDate[key] = dailyByDate[key] ?? { sessions: 0, totalMinutes: 0 };
    dailyByDate[key].sessions += 1;
    dailyByDate[key].totalMinutes += duration ?? 0;
    activeDates.add(key);

    const meta = safeMetadata(row.metadata);
    if (!meta) continue;

    const playType = meta.playType ?? meta.activityType;
    increment(playTypeCount, playType);
    increment(locationCount, meta.location);
    increment(moodCount, meta.mood);
    increment(intensityCount, meta.intensity);
    if (playType) uniquePlayTypes.add(playType);
    if (meta.location === "outdoor" || meta.location === "park") outdoorSessions += 1;
    if (meta.intensity === "active") activeIntensitySessions += 1;
    if (meta.mood === "happy") happyMoodSessions += 1;

    if (Array.isArray(meta.skills)) {
      for (const skill of meta.skills) {
        increment(skillCount, skill);
        uniqueSkills.add(skill);
        totalSkillSelections += 1;
      }
    }
  }

  const averageMinutes =
    durationSessions > 0 ? Math.round(totalMinutes / durationSessions) : 0;
  const shortestSessionResolved =
    Number.isFinite(shortestSessionMinutes) ? shortestSessionMinutes : 0;

  const mostCommonPlayType =
    Object.entries(playTypeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const mostActiveHour =
    Object.entries(hourDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostCommonLocation =
    Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topSkill =
    Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const averageSessionsPerActiveDay =
    activeDates.size > 0 ? Number((totalSessions / activeDates.size).toFixed(1)) : 0;
  const averageSkillsPerSession =
    totalSessions > 0 ? Number((totalSkillSelections / totalSessions).toFixed(1)) : 0;
  const playVarietyScore = Math.min(100, uniquePlayTypes.size * 20 + uniqueSkills.size * 8);
  const consistencyScore =
    totalSessions > 0
      ? Math.min(100, Math.round((activeDates.size / Math.max(1, totalSessions)) * 180))
      : 0;
  const daily = Object.entries(dailyByDate)
    .map(([date, value]) => ({
      date,
      sessions: value.sessions,
      totalMinutes: value.totalMinutes,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const bestPlayDay =
    daily.length > 0
      ? [...daily].sort((a, b) => b.totalMinutes - a.totalMinutes)[0].date
      : null;
  const worstPlayDay =
    daily.length > 0
      ? [...daily].sort((a, b) => a.totalMinutes - b.totalMinutes)[0].date
      : null;

  const outdoorPlayRatioPercent =
    totalSessions > 0 ? Math.round((outdoorSessions / totalSessions) * 1000) / 10 : 0;
  const activePlayRatioPercent =
    totalSessions > 0
      ? Math.round((activeIntensitySessions / totalSessions) * 1000) / 10
      : 0;
  const happyPlayRatioPercent =
    totalSessions > 0 ? Math.round((happyMoodSessions / totalSessions) * 1000) / 10 : 0;

  const motorScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skillCount.motor ?? 0) / totalSessions) * 100)) : 0;
  const cognitiveScore =
    totalSessions > 0
      ? Math.min(100, Math.round(((skillCount.cognitive ?? 0) / totalSessions) * 100))
      : 0;
  const socialScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skillCount.social ?? 0) / totalSessions) * 100)) : 0;
  const languageScore =
    totalSessions > 0
      ? Math.min(100, Math.round(((skillCount.language ?? 0) / totalSessions) * 100))
      : 0;
  const sensoryScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skillCount.sensory ?? 0) / totalSessions) * 100)) : 0;

  const avgDurationScore = Math.min(100, Math.round((averageMinutes / 30) * 100));
  const engagementScore = Math.round(
    avgDurationScore * 0.4 +
      happyPlayRatioPercent * 0.35 +
      activePlayRatioPercent * 0.25
  );

  return NextResponse.json({
    status: "success",

    summary: {
      totalSessions,
      totalMinutes,
      averageMinutes,
      longestSessionMinutes,
      shortestSessionMinutes: shortestSessionResolved,
      mostCommonPlayType,
      mostActiveHour,
      mostCommonLocation,
      topSkill,
      uniquePlayTypes: uniquePlayTypes.size,
      uniqueSkillsPracticed: uniqueSkills.size,
      outdoorPlayRatioPercent,
      activePlayRatioPercent,
      happyPlayRatioPercent,
      activeDays: activeDates.size,
      averageSessionsPerActiveDay,
      averageSkillsPerSession,
      playVarietyScore,
      consistencyScore,
      engagementScore,
      motorScore,
      cognitiveScore,
      socialScore,
      languageScore,
      sensoryScore,
      bestPlayDay,
      worstPlayDay,
    },

    daily,
    distributions: {
      playType: playTypeCount,
      location: locationCount,
      mood: moodCount,
      intensity: intensityCount,
      skills: skillCount,
      hourOfDay: hourDistribution,
    },
  });
}
