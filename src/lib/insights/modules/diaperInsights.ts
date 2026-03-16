import { DashboardInsight } from "../types";
import { getDiaperSummary } from "@/services/analytics/diaperService";

export const DIAPER_INSIGHT_KEYS = [
  "diaper-low-frequency",
  "diaper-high-frequency",
];

export function generateDiaperInsights(
  diaper: any
): DashboardInsight[] {
  if (!diaper?.summary || !diaper?.daily?.length) {
    return [];
  }

  const insights: DashboardInsight[] = [];

  const { summary, daily } = diaper;

  const last3Days = daily.slice(-3);
  const last3Avg =
    last3Days.reduce(
      (sum: number, d: any) => sum + (d.total || 0),
      0
    ) / (last3Days.length || 1);

  /* =========================
     💧 HYDRATION INSIGHTS
  ========================= */

  if (summary.avgWet < 3) {
    insights.push({
      id: "diaper-low-wet-frequency",
      category: "diaper",
      severity: "warning",
      title: "Low Wet Diaper Frequency",
      message:
        "Wet diapers are below typical range. Monitor hydration closely.",
      actionLabel: "View Diaper Details",
      actionUrl: "#diaper",
    });
  } else if (summary.avgWet >= 5) {
    insights.push({
      id: "diaper-healthy-hydration",
      category: "diaper",
      severity: "success",
      title: "Healthy Hydration Pattern",
      message:
        "Wet diaper frequency appears within a healthy range.",
    });
  }

  /* =========================
     💩 STOOL INSIGHTS
  ========================= */

  if (summary.avgWatery > 1) {
    insights.push({
      id: "diaper-watery-pattern",
      category: "diaper",
      severity: "warning",
      title: "Frequent Watery Stools",
      message:
        "Watery stool pattern detected. Monitor for possible diarrhea.",
      actionLabel: "Review Trends",
      actionUrl: "#diaper",
    });
  }

  if (summary.avgHard > 1) {
    insights.push({
      id: "diaper-hard-stool-pattern",
      category: "diaper",
      severity: "info",
      title: "Hard Stool Pattern",
      message:
        "Hard stools detected. Consider monitoring for constipation signs.",
    });
  }

  if (summary.avgDirty < 1) {
    insights.push({
      id: "diaper-low-stool-frequency",
      category: "diaper",
      severity: "info",
      title: "Low Stool Frequency",
      message:
        "Dirty diaper frequency appears lower than usual.",
    });
  }

  /* =========================
     🔴 RASH INSIGHTS
  ========================= */

  if (summary.avgRash > 1) {
    insights.push({
      id: "diaper-rash-frequency",
      category: "diaper",
      severity: "warning",
      title: "Frequent Diaper Rash",
      message:
        "Rash occurrences are elevated. Consider barrier protection.",
      actionLabel: "Check Diaper History",
      actionUrl: "#diaper",
    });
  }

  const recentRash =
    last3Days.reduce(
      (sum: number, d: any) => sum + (d.rash || 0),
      0
    ) > 2;

  if (recentRash) {
    insights.push({
      id: "diaper-recent-rash-spike",
      category: "diaper",
      severity: "critical",
      title: "Recent Rash Spike",
      message:
        "Multiple rash events detected in recent days.",
    });
  }

  /* =========================
     📉 BEHAVIOR CHANGE
  ========================= */

  if (
    summary.avgTotal &&
    last3Avg < summary.avgTotal * 0.5
  ) {
    insights.push({
      id: "diaper-drop",
      category: "diaper",
      severity: "warning",
      title: "Sudden Drop in Diaper Frequency",
      message:
        "Recent diaper counts dropped significantly compared to average.",
    });
  }

  if (
    summary.avgTotal &&
    last3Avg > summary.avgTotal * 1.7
  ) {
    insights.push({
      id: "diaper-spike",
      category: "diaper",
      severity: "info",
      title: "Increased Diaper Activity",
      message:
        "Recent diaper frequency increased compared to baseline.",
    });
  }

  /* =========================
     ✅ STABILITY REWARD
  ========================= */

  if (
    insights.length === 0 &&
    summary.avgTotal >= 4 &&
    summary.avgWet >= 3
  ) {
    insights.push({
      id: "diaper-stable-diaper-pattern",
      category: "diaper",
      severity: "success",
      title: "Stable Diaper Pattern",
      message:
        "Diaper activity appears balanced and consistent.",
    });
  }

  return insights;
}

export async function runDiaperInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const summary = await getDiaperSummary(babyId, days);

  const insights: DashboardInsight[] = [];
  const avgTotal = summary?.summary?.avgTotal ?? 0;

  if (avgTotal > 0 && avgTotal < 4) {
    insights.push({
      id: "diaper-low-frequency",
      category: "diaper",
      severity: "warning",
      title: "Low Diaper Frequency",
      message: "Diaper changes are below typical range.",
    });
  }

  if (avgTotal > 8) {
    insights.push({
      id: "diaper-high-frequency",
      category: "diaper",
      severity: "info",
      title: "High Diaper Frequency",
      message: "Diaper changes are above normal levels.",
    });
  }

  return insights;
}
