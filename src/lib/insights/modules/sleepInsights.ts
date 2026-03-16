import { DashboardInsight } from "../types";
import {
  dateKeyUTC,
  fetchActivitiesBySlug,
  getDateRange,
  mean,
  stdDev,
} from "../processorUtils";

export const SLEEP_INSIGHT_KEYS = [
  "sleep-low-sleep",
  "sleep-improving-trend",
  "sleep-emerging-nap-schedule",
];

export function generateSleepInsights(summary: any): DashboardInsight[] {
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (
    typeof summary.avgDailyMinutes === "number" &&
    summary.avgDailyMinutes < 600
  ) {
    insights.push({
      id: "sleep-low-sleep",
      category: "sleep",
      severity: "warning",
      title: "Low Average Sleep",
      message: "Baby is sleeping less than recommended.",
    });
  }

  if (
    typeof summary.consistencyScore === "number" &&
    summary.consistencyScore > 85
  ) {
    insights.push({
      id: "sleep-stable-sleep",
      category: "sleep",
      severity: "success",
      title: "Stable Sleep Pattern",
      message: "Sleep schedule is consistent.",
    });
  }

  return insights;
}

export async function runSleepInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days * 2);

  const sleepActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "sleep",
    startDate,
    endDate,
  });

  const dailyTotals = new Map<string, number>();
  sleepActivities.forEach((activity) => {
    if (!activity.endTime) return;
    const minutes = Math.max(
      0,
      (activity.endTime.getTime() - activity.startTime.getTime()) / 60000
    );
    const key = dateKeyUTC(activity.startTime);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + minutes);
  });

  const keys = Array.from(dailyTotals.keys()).sort();
  const last7 = keys.slice(-days);
  const prev3 = keys.slice(-(days + 3), -days);
  const last3 = keys.slice(-3);

  const avgLast7 =
    last7.reduce((sum, k) => sum + (dailyTotals.get(k) ?? 0), 0) / days;

  const avgPrev3 = prev3.length
    ? prev3.reduce((sum, k) => sum + (dailyTotals.get(k) ?? 0), 0) / prev3.length
    : 0;

  const avgLast3 = last3.length
    ? last3.reduce((sum, k) => sum + (dailyTotals.get(k) ?? 0), 0) / last3.length
    : 0;

  const insights: DashboardInsight[] = [];

  if (avgLast7 > 0 && avgLast7 < 600) {
    insights.push({
      id: "sleep-low-sleep",
      category: "sleep",
      severity: "warning",
      title: "Low Average Sleep",
      message: "Baby is sleeping less than recommended.",
    });
  }

  if (avgPrev3 > 0 && avgLast3 > avgPrev3 * 1.1) {
    insights.push({
      id: "sleep-improving-trend",
      category: "sleep",
      severity: "success",
      title: "Improving Sleep Trend",
      message: "Sleep duration has improved over the last few days.",
    });
  }

  const napRange = getDateRange(days);
  const napActivities = await fetchActivitiesBySlug({
    babyId,
    slug: "nap",
    startDate: napRange.startDate,
    endDate: napRange.endDate,
  });

  const napHours = napActivities.map((n) => n.startTime.getHours());
  if (napHours.length >= 3) {
    const napStd = stdDev(napHours);
    const napMean = mean(napHours);
    if (napStd <= 1.5) {
      insights.push({
        id: "sleep-emerging-nap-schedule",
        category: "sleep",
        severity: "info",
        title: "Emerging Nap Schedule",
        message: `Naps are clustering around ${Math.round(napMean)}:00.`,
      });
    }
  }

  return insights;
}
