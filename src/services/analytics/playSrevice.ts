import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";

type PlayMetadata = {
  playType?: string;
  location?: string;
  intensity?: string;
  mood?: string;
  skills?: string[];
};

export type PlayAnalyticsResult = {
  summary: {
    totalSessions: number;
    totalMinutes: number;
    averageMinutes: number;
    mostCommonPlayType: string | null;
    mostActiveHour: number | null;
    mostCommonLocation: string | null;
    activeDays: number;
    averageSessionsPerActiveDay: number;
    averageSkillsPerSession: number;
    playVarietyScore: number;
    consistencyScore: number;
    outdoorPlayRatioPercent: number;
    activePlayRatioPercent: number;
    happyPlayRatioPercent: number;
    uniquePlayTypes: number;
    uniqueSkillsPracticed: number;
    motorScore: number;
    cognitiveScore: number;
    socialScore: number;
    languageScore: number;
    sensoryScore: number;
  };

  distributions: {
    playType: Record<string, number>;
    location: Record<string, number>;
    mood: Record<string, number>;
    intensity: Record<string, number>;
    skills: Record<string, number>;
    hourOfDay: Record<number, number>;
  };
};

function increment(map: Record<string, number>, key?: string | number | null) {
  if (key === undefined || key === null) return;
  const k = String(key);
  map[k] = (map[k] ?? 0) + 1;
}

function safeMetadata(meta: unknown): PlayMetadata | null {
  if (!meta || typeof meta !== "object") return null;
  return meta as PlayMetadata;
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

export async function getPlayAnalytics(params: {
  babyId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<PlayAnalyticsResult> {
  const { babyId, startDate, endDate } = params;

  const conditions = [
    eq(activityTypes.slug, "play"),
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
      endTime: activities.endTime,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(and(...conditions));

  let totalSessions = 0;
  let totalMinutes = 0;
  let durationSessions = 0;
  let outdoorSessions = 0;
  let activeIntensitySessions = 0;
  let happyMoodSessions = 0;
  let totalSkillSelections = 0;

  const playType: Record<string, number> = {};
  const location: Record<string, number> = {};
  const mood: Record<string, number> = {};
  const intensity: Record<string, number> = {};
  const skills: Record<string, number> = {};
  const hourOfDay: Record<number, number> = {};
  const uniquePlayTypes = new Set<string>();
  const uniqueSkills = new Set<string>();
  const activeDates = new Set<string>();

  for (const row of rows) {
    totalSessions++;

    const duration =
      typeof row.durationMinutes === "number"
        ? row.durationMinutes
        : row.endTime
          ? Math.max(
              0,
              Math.round(
                (new Date(row.endTime).getTime() - new Date(row.startTime).getTime()) / 60000
              )
            )
          : null;

    if (duration !== null) {
      totalMinutes += duration;
      durationSessions += 1;
    }

    const hour = new Date(row.startTime).getHours();
    hourOfDay[hour] = (hourOfDay[hour] ?? 0) + 1;
    activeDates.add(dateKeyUTC(new Date(row.startTime)));

    const meta = safeMetadata(row.metadata);
    if (!meta) continue;

    const resolvedPlayType = meta.playType;
    increment(playType, resolvedPlayType);
    increment(location, meta.location);
    increment(mood, meta.mood);
    increment(intensity, meta.intensity);
    if (resolvedPlayType) uniquePlayTypes.add(resolvedPlayType);
    if (meta.location === "outdoor" || meta.location === "park") outdoorSessions += 1;
    if (meta.intensity === "active") activeIntensitySessions += 1;
    if (meta.mood === "happy") happyMoodSessions += 1;

    if (Array.isArray(meta.skills)) {
      for (const skill of meta.skills) {
        increment(skills, skill);
        uniqueSkills.add(skill);
        totalSkillSelections += 1;
      }
    }
  }

  const averageMinutes =
    durationSessions > 0 ? Math.round(totalMinutes / durationSessions) : 0;

  const mostCommonLocation = mostCommon(location);
  const averageSessionsPerActiveDay =
    activeDates.size > 0 ? Number((totalSessions / activeDates.size).toFixed(1)) : 0;
  const averageSkillsPerSession =
    totalSessions > 0 ? Number((totalSkillSelections / totalSessions).toFixed(1)) : 0;
  const playVarietyScore = Math.min(100, uniquePlayTypes.size * 20 + uniqueSkills.size * 8);
  const consistencyScore =
    totalSessions > 0
      ? Math.min(100, Math.round((activeDates.size / Math.max(1, totalSessions)) * 180))
      : 0;
  const outdoorPlayRatioPercent =
    totalSessions > 0 ? Math.round((outdoorSessions / totalSessions) * 1000) / 10 : 0;
  const activePlayRatioPercent =
    totalSessions > 0
      ? Math.round((activeIntensitySessions / totalSessions) * 1000) / 10
      : 0;
  const happyPlayRatioPercent =
    totalSessions > 0 ? Math.round((happyMoodSessions / totalSessions) * 1000) / 10 : 0;
  const motorScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skills.motor ?? 0) / totalSessions) * 100)) : 0;
  const cognitiveScore =
    totalSessions > 0
      ? Math.min(100, Math.round(((skills.cognitive ?? 0) / totalSessions) * 100))
      : 0;
  const socialScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skills.social ?? 0) / totalSessions) * 100)) : 0;
  const languageScore =
    totalSessions > 0
      ? Math.min(100, Math.round(((skills.language ?? 0) / totalSessions) * 100))
      : 0;
  const sensoryScore =
    totalSessions > 0 ? Math.min(100, Math.round(((skills.sensory ?? 0) / totalSessions) * 100)) : 0;

  return {
    summary: {
      totalSessions,
      totalMinutes,
      averageMinutes,
      mostCommonPlayType: mostCommon(playType),
      mostActiveHour: mostCommonHour(hourOfDay),
      mostCommonLocation,
      activeDays: activeDates.size,
      averageSessionsPerActiveDay,
      averageSkillsPerSession,
      playVarietyScore,
      consistencyScore,
      outdoorPlayRatioPercent,
      activePlayRatioPercent,
      happyPlayRatioPercent,
      uniquePlayTypes: uniquePlayTypes.size,
      uniqueSkillsPracticed: uniqueSkills.size,
      motorScore,
      cognitiveScore,
      socialScore,
      languageScore,
      sensoryScore,
    },

    distributions: {
      playType,
      location,
      mood,
      intensity,
      skills,
      hourOfDay,
    },
  };
}
