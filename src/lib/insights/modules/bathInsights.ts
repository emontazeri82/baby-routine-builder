import { DashboardInsight } from "../types";
import { getBathAnalytics } from "@/services/analytics/bathService";
import { getDateRange } from "../processorUtils";

export const BATH_INSIGHT_KEYS = [
  "bath-low-frequency",
  "bath-mood-improves",
  "bath-common-hour",
];

type BathAnalytics = {
  summary?: {
    weeklyFrequency?: number;
    moodImproved?: number;
    moodWorsened?: number;
    mostCommonBathHour?: number | null;
  };
};

export function generateBathInsights(
  bath: BathAnalytics | null | undefined
): DashboardInsight[] {
  const summary = bath?.summary;
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (typeof summary.weeklyFrequency === "number" && summary.weeklyFrequency < 3) {
    insights.push({
      id: "bath-low-frequency",
      category: "bath",
      severity: "info",
      title: "Low Bath Frequency",
      message: "Bath routine may be less frequent this week.",
    });
  }

  if (
    typeof summary.moodImproved === "number" &&
    typeof summary.moodWorsened === "number" &&
    summary.moodImproved > summary.moodWorsened
  ) {
    insights.push({
      id: "bath-mood-improves",
      category: "bath",
      severity: "success",
      title: "Bath Improves Mood",
      message: "Baby mood often improves after bath sessions.",
    });
  }

  if (typeof summary.mostCommonBathHour === "number") {
    insights.push({
      id: "bath-common-hour",
      category: "bath",
      severity: "info",
      title: "Consistent Bath Time",
      message: `Baths usually happen around ${summary.mostCommonBathHour}:00.`,
    });
  }

  return insights;
}

export async function runBathInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getBathAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generateBathInsights(analytics);
}
