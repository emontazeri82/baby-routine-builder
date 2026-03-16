import { DashboardInsight } from "../types";
import { getPumpingAnalytics } from "@/services/analytics/pumpingService";
import { getDateRange } from "../processorUtils";

export const PUMPING_INSIGHT_KEYS = [
  "pumping-no-pumping-records",
  "pumping-low-pumping-frequency",
  "pumping-consistent-pumping",
  "pumping-low-milk-output",
  "pumping-strong-milk-output",
  "pumping-short-pumping-sessions",
  "pumping-long-pumping-sessions",
  "pumping-high-pumping-discomfort",
  "pumping-moderate-pumping-discomfort",
  "pumping-side-preference",
  "pumping-balanced-pumping",
  "pumping-time-pattern",
];

type PumpSide = "left" | "right" | "both";

type PumpingSummary = {
  totalSessions: number;
  totalAmountMl: number;
  avgAmountPerSessionMl: number;
  avgDurationMinutes: number;
  mostCommonSide: PumpSide | null;
  mostCommonHour: number | null;
  painRatioPercent: number;
};

type PumpingAnalytics = {
  summary: PumpingSummary;
};

export function generatePumpingInsights(
  pumping: PumpingAnalytics | null | undefined,
  days: number
): DashboardInsight[] {

  if (!pumping?.summary) {
    return [];
  }

  const insights: DashboardInsight[] = [];
  const s = pumping.summary;

  /* =========================
     🍼 PUMPING FREQUENCY
  ========================= */

  if (s.totalSessions === 0) {
    insights.push({
      id: "pumping-no-pumping-records",
      category: "pumping",
      severity: "warning",
      title: "No Pumping Sessions Recorded",
      message:
        "No pumping activity has been logged during the selected period.",
      actionLabel: "Log Pumping Session",
      actionUrl: "#pumping",
    });
  }

  if (s.totalSessions > 0 && s.totalSessions < days) {
    insights.push({
      id: "pumping-low-pumping-frequency",
      category: "pumping",
      severity: "info",
      title: "Low Pumping Frequency",
      message:
        "Pumping sessions appear less frequent than expected.",
      actionLabel: "View Pumping Analytics",
      actionUrl: "#pumping",
    });
  }

  if (s.totalSessions >= days * 2) {
    insights.push({
      id: "pumping-consistent-pumping",
      category: "pumping",
      severity: "success",
      title: "Consistent Pumping Routine",
      message:
        "A consistent pumping routine has been detected.",
    });
  }

  /* =========================
     🥛 MILK SUPPLY
  ========================= */

  if (s.avgAmountPerSessionMl < 30) {
    insights.push({
      id: "pumping-low-milk-output",
      category: "pumping",
      severity: "warning",
      title: "Low Milk Output",
      message:
        "Average milk output per session appears lower than typical.",
      actionLabel: "View Pumping Trends",
      actionUrl: "#pumping",
    });
  }

  if (s.avgAmountPerSessionMl >= 60) {
    insights.push({
      id: "pumping-strong-milk-output",
      category: "pumping",
      severity: "success",
      title: "Strong Milk Production",
      message:
        "Milk output per pumping session appears strong.",
    });
  }

  /* =========================
     ⏱ SESSION DURATION
  ========================= */

  if (s.avgDurationMinutes < 10) {
    insights.push({
      id: "pumping-short-pumping-sessions",
      category: "pumping",
      severity: "info",
      title: "Short Pumping Sessions",
      message:
        "Average pumping sessions appear shorter than typical.",
    });
  }

  if (s.avgDurationMinutes > 30) {
    insights.push({
      id: "pumping-long-pumping-sessions",
      category: "pumping",
      severity: "info",
      title: "Long Pumping Sessions",
      message:
        "Pumping sessions are longer than usual.",
    });
  }

  /* =========================
     ⚠️ DISCOMFORT
  ========================= */

  if (s.painRatioPercent > 40) {
    insights.push({
      id: "pumping-high-pumping-discomfort",
      category: "pumping",
      severity: "critical",
      title: "Frequent Pumping Discomfort",
      message:
        "Frequent discomfort has been reported during pumping sessions.",
    });
  } else if (s.painRatioPercent > 20) {
    insights.push({
      id: "pumping-moderate-pumping-discomfort",
      category: "pumping",
      severity: "warning",
      title: "Pumping Discomfort Detected",
      message:
        "Some pumping discomfort has been reported.",
    });
  }

  /* =========================
     🔄 SIDE BALANCE
  ========================= */

  if (s.mostCommonSide === "left" || s.mostCommonSide === "right") {
    insights.push({
      id: "pumping-side-preference",
      category: "pumping",
      severity: "info",
      title: "Pumping Side Preference",
      message:
        `Pumping sessions most frequently occur on the ${s.mostCommonSide} side.`,
    });
  }

  if (s.mostCommonSide === "both") {
    insights.push({
      id: "pumping-balanced-pumping",
      category: "pumping",
      severity: "success",
      title: "Balanced Pumping Pattern",
      message:
        "Pumping appears balanced between both sides.",
    });
  }

  /* =========================
     🕒 ROUTINE PATTERN
  ========================= */

  if (s.mostCommonHour !== null) {
    insights.push({
      id: "pumping-time-pattern",
      category: "pumping",
      severity: "info",
      title: "Pumping Time Pattern",
      message:
        `Most pumping sessions occur around ${s.mostCommonHour}:00.`,
    });
  }

  return insights;
}

export async function runPumpingInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getPumpingAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generatePumpingInsights(analytics, days);
}
