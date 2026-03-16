import { DashboardInsight } from "../types";
import {
  fetchActivitiesBySlug,
  getDateRange,
  hoursBetween,
  stdDev,
} from "../processorUtils";

export const FEEDING_INSIGHT_KEYS = [
  "feeding-gap-detected",
  "feeding-interval-consistency",
  "feeding-frequency-drop",
  "feeding-frequency-rise",
];

export function generateFeedingInsights(summary: any): DashboardInsight[] {
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  const minutes = summary.predictedNextFeedInMinutes;

  if (minutes !== null && minutes !== undefined) {
    const rounded = Math.round(minutes);

    if (rounded < 0) {
      insights.push({
        id: "feeding-overdue",
        category: "feeding",
        severity: "critical",
        title: "Feeding Overdue",
        message: `Feeding overdue by ${Math.abs(rounded)} minutes.`,
      });
    } else if (rounded === 0) {
      insights.push({
        id: "feeding-due-now",
        category: "feeding",
        severity: "warning",
        title: "Feeding Due Now",
        message: "Feeding is due now.",
      });
    } else if (rounded <= 15) {
      insights.push({
        id: "feeding-soon",
        category: "feeding",
        severity: "warning",
        title: "Feeding Expected Soon",
        message: `Next feed likely in ${rounded} minutes.`,
      });
    }
  }

  if (summary.avgFeedDurationMinutes > 40) {
    insights.push({
      id: "feeding-long-feeds",
      category: "feeding",
      severity: "info",
      title: "Long Feeding Sessions",
      message: "Feeds are lasting longer than average.",
    });
  }

  return insights;
}

export async function runFeedingInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
  gapHours?: number;
}) {
  const {
    babyId,
    activityId = null,
    days = 7,
    gapHours = 4,
  } = params;

  const { startDate, endDate } = getDateRange(days);
  const activities = await fetchActivitiesBySlug({
    babyId,
    slug: "feeding",
    startDate,
    endDate,
  });

  const insights: DashboardInsight[] = [];

  const sorted = [...activities].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const lastFeed = sorted[sorted.length - 1];
  if (lastFeed) {
    const lastTime = lastFeed.endTime ?? lastFeed.startTime;
    const gap = hoursBetween(lastTime, new Date());
    if (gap >= gapHours) {
      insights.push({
        id: "feeding-gap-detected",
        category: "feeding",
        severity: "warning",
        title: "Feeding Gap Detected",
        message: `No feeding recorded in the last ${Math.round(gap)} hours.`,
      });
    }
  }

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    const diffMinutes =
      (current.startTime.getTime() - prev.startTime.getTime()) / 60000;
    if (diffMinutes > 0) intervals.push(diffMinutes);
  }

  if (intervals.length >= 4) {
    const intervalStd = stdDev(intervals);
    if (intervalStd <= 30) {
      insights.push({
        id: "feeding-interval-consistency",
        category: "feeding",
        severity: "success",
        title: "Consistent Feeding Intervals",
        message: "Feeding intervals have been fairly consistent.",
      });
    }
  }

  const last3Start = getDateRange(3).startDate;
  const prev3Start = getDateRange(6).startDate;
  const prev3End = new Date(last3Start);

  const last3Count = sorted.filter(
    (a) => a.startTime >= last3Start
  ).length;
  const prev3Count = sorted.filter(
    (a) => a.startTime >= prev3Start && a.startTime < prev3End
  ).length;

  if (prev3Count > 0) {
    const change = (last3Count - prev3Count) / prev3Count;
    if (change <= -0.3) {
      insights.push({
        id: "feeding-frequency-drop",
        category: "feeding",
        severity: "warning",
        title: "Feeding Frequency Dropped",
        message: "Feeding frequency is lower than the previous few days.",
      });
    } else if (change >= 0.3) {
      insights.push({
        id: "feeding-frequency-rise",
        category: "feeding",
        severity: "info",
        title: "Feeding Frequency Increased",
        message: "Feeding frequency has increased recently.",
      });
    }
  }

  return insights;
}
