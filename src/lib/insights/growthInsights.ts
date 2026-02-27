import { DashboardInsight } from "./types";

export function generateGrowthInsights(summary: any): DashboardInsight[] {
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (summary.trend?.includes("plateau")) {
    insights.push({
      id: "growth-plateau",
      category: "growth",
      severity: "warning",
      title: "Growth Plateau Detected",
      message: "Consider consulting your pediatrician if this continues.",
    });
  }

  if (summary.trend?.includes("Healthy")) {
    insights.push({
      id: "healthy-growth",
      category: "growth",
      severity: "success",
      title: "Healthy Growth Trend",
      message: "Growth is progressing normally.",
    });
  }

  return insights;
}
