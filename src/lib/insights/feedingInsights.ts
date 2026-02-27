import { DashboardInsight } from "./types";

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
      id: "long-feeds",
      category: "feeding",
      severity: "info",
      title: "Long Feeding Sessions",
      message: "Feeds are lasting longer than average.",
    });
  }

  return insights;
}

