import { DashboardInsight } from "./types";
import {
  dateKeyUTC,
  fetchActivitiesBySlug,
  getDateRange,
  mean,
  stdDev,
} from "./processorUtils";

export const ROUTINE_INSIGHT_KEYS = [
  "routine-consistent-bedtime",
  "routine-consistent-nap-window",
  "routine-missing-bath",
  "routine-missing-play",
];

export async function runRoutineInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);

  const insights: DashboardInsight[] = [];

  /* ---------------- Bedtime Consistency ---------------- */

  const sleepActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "sleep",
    startDate,
    endDate,
  });

  const bedtimeByDay = new Map<string, number>();
  sleepActivities.forEach((activity) => {
    const hour = activity.startTime.getHours();
    if (hour < 18 || hour > 23) return;
    const key = dateKeyUTC(activity.startTime);
    const existing = bedtimeByDay.get(key);
    if (existing === undefined || hour > existing) {
      bedtimeByDay.set(key, hour);
    }
  });

  const bedtimeHours = Array.from(bedtimeByDay.values());
  if (bedtimeHours.length >= 3 && stdDev(bedtimeHours) <= 1) {
    const avg = mean(bedtimeHours);
    insights.push({
      id: "routine-consistent-bedtime",
      category: "sleep",
      severity: "success",
      title: "Consistent Bedtime Pattern",
      message: `Bedtime is consistently around ${Math.round(avg)}:00.`,
    });
  }

  /* ---------------- Nap Window Consistency ---------------- */

  const napActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "nap",
    startDate,
    endDate,
  });

  const napHours = napActivities.map((n) => n.startTime.getHours());
  if (napHours.length >= 3 && stdDev(napHours) <= 1) {
    const avg = mean(napHours);
    insights.push({
      id: "routine-consistent-nap-window",
      category: "nap",
      severity: "info",
      title: "Consistent Nap Window",
      message: `Naps are clustering around ${Math.round(avg)}:00.`,
    });
  }

  /* ---------------- Missing Routine Events ---------------- */

  const bathActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "bath",
    startDate,
    endDate,
  });

  if (bathActivities.length === 0) {
    insights.push({
      id: "routine-missing-bath",
      category: "bath",
      severity: "warning",
      title: "Bath Routine Missing",
      message: "No bath activity recorded in the past week.",
    });
  }

  const playRange = getDateRange(3);
  const playActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "play",
    startDate: playRange.startDate,
    endDate: playRange.endDate,
  });

  if (playActivities.length === 0) {
    insights.push({
      id: "routine-missing-play",
      category: "play",
      severity: "warning",
      title: "Play Activity Missing",
      message: "No play activity recorded in the last few days.",
    });
  }

  return insights;
}
