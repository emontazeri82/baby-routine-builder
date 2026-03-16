import { DashboardInsight } from "../types";
import { getGrowthSummary } from "@/services/analytics/growthService";

export const GROWTH_INSIGHT_KEYS = [
  "growth-plateau",
  "growth-healthy-growth",
];

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
      id: "growth-healthy-growth",
      category: "growth",
      severity: "success",
      title: "Healthy Growth Trend",
      message: "Growth is progressing normally.",
    });
  }

  return insights;
}

export async function runGrowthInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const summary = await getGrowthSummary(babyId, days);
  return generateGrowthInsights(summary);
}
