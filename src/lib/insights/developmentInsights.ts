import { DashboardInsight } from "./types";
import {
  dateKeyUTC,
  fetchActivitiesBySlug,
  getDateRange,
} from "./processorUtils";

export const DEVELOPMENT_INSIGHT_KEYS = [
  "development-tummy-time-streak",
  "development-increasing-play",
];

type PlayMeta = {
  playType?: string;
  activityType?: string;
};

function getDurationMinutes(activity: {
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
}) {
  if (typeof activity.durationMinutes === "number") {
    return activity.durationMinutes;
  }

  if (activity.endTime) {
    return Math.max(
      0,
      (activity.endTime.getTime() - activity.startTime.getTime()) / 60000
    );
  }

  return 0;
}

export async function runDevelopmentInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);

  const playActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "play",
    startDate,
    endDate,
  });

  const insights: DashboardInsight[] = [];

  /* ---------------- Tummy Time Streak ---------------- */

  const tummyDays = new Set<string>();
  playActivities.forEach((activity) => {
    const meta = (activity.metadata ?? {}) as PlayMeta;
    const type = meta.playType ?? meta.activityType;
    if (type === "tummy_time") {
      tummyDays.add(dateKeyUTC(activity.startTime));
    }
  });

  let streak = 0;
  const dayKeys: string[] = [];
  const rangeStart = new Date(startDate);
  for (let d = 0; d < days; d++) {
    const day = new Date(rangeStart);
    day.setDate(rangeStart.getDate() + d);
    dayKeys.push(dateKeyUTC(day));
  }
  for (let i = dayKeys.length - 1; i >= 0; i--) {
    if (tummyDays.has(dayKeys[i])) streak++;
    else break;
  }

  if (streak >= 3) {
    insights.push({
      id: "development-tummy-time-streak",
      category: "play",
      severity: "success",
      title: "Tummy Time Streak",
      message: `Tummy time recorded ${streak} days in a row.`,
    });
  }

  /* ---------------- Increasing Play Activity ---------------- */

  const last3Start = getDateRange(3).startDate;
  const prev3Start = getDateRange(6).startDate;
  const prev3End = new Date(last3Start);

  const last3Minutes = playActivities
    .filter((a) => a.startTime >= last3Start)
    .reduce((sum, a) => sum + getDurationMinutes(a), 0);

  const prev3Minutes = playActivities
    .filter((a) => a.startTime >= prev3Start && a.startTime < prev3End)
    .reduce((sum, a) => sum + getDurationMinutes(a), 0);

  if (prev3Minutes > 0) {
    const change = (last3Minutes - prev3Minutes) / prev3Minutes;
    if (change >= 0.2) {
      insights.push({
        id: "development-increasing-play",
        category: "play",
        severity: "success",
        title: "Increasing Play Activity",
        message: "Play time has increased over the last few days.",
      });
    }
  }

  return insights;
}
