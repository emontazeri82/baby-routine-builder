import { DashboardInsight } from "./types";

export function generateSleepInsights(summary: any): DashboardInsight[] {
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (
    typeof summary.avgDailyMinutes === "number" &&
    summary.avgDailyMinutes < 600
  ) {
    insights.push({
      id: "low-sleep",
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
      id: "stable-sleep",
      category: "sleep",
      severity: "success",
      title: "Stable Sleep Pattern",
      message: "Sleep schedule is consistent.",
    });
  }

  return insights;
}
