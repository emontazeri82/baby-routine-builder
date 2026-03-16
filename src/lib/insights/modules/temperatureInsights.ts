import { DashboardInsight } from "../types";
import { getTemperatureAnalytics } from "@/services/analytics/temperatureService";
import { getDateRange } from "../processorUtils";

export const TEMPERATURE_INSIGHT_KEYS = [
  "temperature-high-fever",
  "temperature-fever",
  "temperature-stable",
];

type TemperatureAnalytics = {
  summary?: {
    feverCount?: number;
    highFeverCount?: number;
    avgTemperature?: number | null;
  };
};

export function generateTemperatureInsights(
  temperature: TemperatureAnalytics | null | undefined
): DashboardInsight[] {
  const summary = temperature?.summary;
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if ((summary.highFeverCount ?? 0) > 0) {
    insights.push({
      id: "temperature-high-fever",
      category: "temperature",
      severity: "critical",
      title: "High Fever Detected",
      message: "High fever readings were logged. Monitor closely.",
    });
  }

  if ((summary.feverCount ?? 0) > 0) {
    insights.push({
      id: "temperature-fever",
      category: "temperature",
      severity: "warning",
      title: "Fever Readings Logged",
      message: `Fever detected ${summary.feverCount} time(s) in this range.`,
    });
  }

  if (
    typeof summary.avgTemperature === "number" &&
    summary.avgTemperature > 0 &&
    summary.avgTemperature < 37.6
  ) {
    insights.push({
      id: "temperature-stable",
      category: "temperature",
      severity: "success",
      title: "Temperature Stable",
      message: "Average temperature remains in a normal range.",
    });
  }

  return insights;
}

export async function runTemperatureInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getTemperatureAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generateTemperatureInsights(analytics);
}
