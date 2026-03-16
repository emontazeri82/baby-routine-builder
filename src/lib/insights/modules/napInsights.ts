import { DashboardInsight } from "../types";
import { getNapAnalytics } from "@/services/analytics/napService";
import { getDateRange } from "../processorUtils";

export const NAP_INSIGHT_KEYS = [
  "nap-low-frequency",
  "nap-assisted-high",
  "nap-poor-quality",
];

type NapAnalytics = {
  summary?: {
    avgNapsPerDay?: number;
    assistedRatioPercent?: number;
    mostCommonQuality?: string | null;
  };
};

export function generateNapInsights(
  nap: NapAnalytics | null | undefined
): DashboardInsight[] {
  const summary = nap?.summary;
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (typeof summary.avgNapsPerDay === "number" && summary.avgNapsPerDay < 2) {
    insights.push({
      id: "nap-low-frequency",
      category: "nap",
      severity: "warning",
      title: "Low Nap Frequency",
      message: "Low nap frequency detected.",
    });
  }

  if (
    typeof summary.assistedRatioPercent === "number" &&
    summary.assistedRatioPercent > 60
  ) {
    insights.push({
      id: "nap-assisted-high",
      category: "nap",
      severity: "info",
      title: "Assisted Naps Frequent",
      message: "Baby often requires assisted sleep for naps.",
    });
  }

  if (summary.mostCommonQuality === "poor") {
    insights.push({
      id: "nap-poor-quality",
      category: "nap",
      severity: "warning",
      title: "Poor Nap Quality",
      message: "Many naps recorded with poor quality.",
    });
  }

  return insights;
}

export async function runNapInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getNapAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generateNapInsights(analytics);
}
