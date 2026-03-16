import { DashboardInsight } from "../types";
import { getMedicineAnalytics } from "@/services/analytics/medicineService";
import { getDateRange } from "../processorUtils";

export const MEDICINE_INSIGHT_KEYS = [
  "medicine-high-frequency",
  "medicine-short-interval",
  "medicine-reactions",
  "medicine-stable",
];

type MedicineAnalytics = {
  summary?: {
    totalMedicines?: number;
    avgMedicinesPerDay?: number;
    avgIntervalMinutes?: number | null;
    reactionsDetected?: number;
  };
};

export function generateMedicineInsights(
  medicine: MedicineAnalytics | null | undefined
): DashboardInsight[] {
  const summary = medicine?.summary;
  if (!summary) return [];

  const insights: DashboardInsight[] = [];

  if (
    typeof summary.avgMedicinesPerDay === "number" &&
    summary.avgMedicinesPerDay >= 4
  ) {
    insights.push({
      id: "medicine-high-frequency",
      category: "medicine",
      severity: "warning",
      title: "High Medicine Frequency",
      message: "Medicine frequency is elevated. Review dosing cadence.",
    });
  }

  if (
    typeof summary.avgIntervalMinutes === "number" &&
    summary.avgIntervalMinutes > 0 &&
    summary.avgIntervalMinutes < 120
  ) {
    insights.push({
      id: "medicine-short-interval",
      category: "medicine",
      severity: "critical",
      title: "Short Dose Intervals",
      message: "Dose intervals look short. Verify schedule and dosage safety.",
    });
  }

  if (
    typeof summary.reactionsDetected === "number" &&
    summary.reactionsDetected > 0
  ) {
    insights.push({
      id: "medicine-reactions",
      category: "medicine",
      severity: "warning",
      title: "Reactions Logged",
      message: "Possible medicine reactions were recorded.",
    });
  }

  if (
    typeof summary.totalMedicines === "number" &&
    summary.totalMedicines > 0 &&
    (summary.reactionsDetected ?? 0) === 0
  ) {
    insights.push({
      id: "medicine-stable",
      category: "medicine",
      severity: "success",
      title: "Medicine Tracking Stable",
      message: "No adverse reactions recorded in the selected range.",
    });
  }

  return insights;
}

export async function runMedicineInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getMedicineAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generateMedicineInsights(analytics);
}
