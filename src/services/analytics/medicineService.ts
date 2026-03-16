import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { startOfDay, differenceInMinutes } from "date-fns";

type MedicineAnalyticsParams = {
  babyId: string;
  startDate: Date;
  endDate: Date;
};

type MedicineMetadata = {
  medicineName?: string;
  dose?: number;
  unit?: string;
  method?: string;
  reason?: string;
  reaction?: string;
};

export async function getMedicineAnalytics({
  babyId,
  startDate,
  endDate,
}: MedicineAnalyticsParams) {
  const rows = await db
    .select({
      startTime: activities.startTime,
      metadata: activities.metadata,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activityTypes.slug, "medicine"),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      )
    );

  const medicines = rows.map((r) => ({
    startTime: r.startTime,
    ...(r.metadata as MedicineMetadata),
  }));

  /* ================= DAILY ================= */

  const dailyMap: Record<string, number> = {};

  medicines.forEach((m) => {
    const day = startOfDay(m.startTime).toISOString();

    if (!dailyMap[day]) dailyMap[day] = 0;
    dailyMap[day]++;
  });

  const daily = Object.entries(dailyMap).map(([date, total]) => ({
    date,
    totalMedicines: total,
  }));

  /* ================= DISTRIBUTIONS ================= */

  const medicineNameDist: Record<string, number> = {};
  const reasonDist: Record<string, number> = {};
  const reactionDist: Record<string, number> = {};
  const methodDist: Record<string, number> = {};
  const hourDist: Record<number, number> = {};

  let totalDose = 0;
  let doseCount = 0;

  medicines.forEach((m) => {
    if (m.medicineName) {
      medicineNameDist[m.medicineName] =
        (medicineNameDist[m.medicineName] || 0) + 1;
    }

    if (m.reason) {
      reasonDist[m.reason] = (reasonDist[m.reason] || 0) + 1;
    }

    if (m.reaction) {
      reactionDist[m.reaction] = (reactionDist[m.reaction] || 0) + 1;
    }

    if (m.method) {
      methodDist[m.method] = (methodDist[m.method] || 0) + 1;
    }

    const hour = new Date(m.startTime).getHours();
    hourDist[hour] = (hourDist[hour] || 0) + 1;

    if (m.dose) {
      totalDose += m.dose;
      doseCount++;
    }
  });

  /* ================= INTERVAL ANALYSIS ================= */

  const sorted = medicines
    .map((m) => new Date(m.startTime))
    .sort((a, b) => a.getTime() - b.getTime());

  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInMinutes(sorted[i], sorted[i - 1]);
    intervals.push(diff);
  }

  const avgInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : null;

  /* ================= MOST COMMON HELPERS ================= */

  function getMostCommon<T extends string | number>(
    obj: Record<T, number>
  ): T | null {
    const entries = Object.entries(obj) as Array<[T, number]>;
    if (!entries.length) return null;

    return entries.sort((a, b) => b[1] - a[1])[0][0] as T;
  }

  const mostCommonMedicine = getMostCommon(medicineNameDist);
  const mostCommonReason = getMostCommon(reasonDist);
  const mostCommonMethod = getMostCommon(methodDist);
  const mostCommonHour = getMostCommon(hourDist);

  /* ================= REACTION ANALYSIS ================= */

  const reactionCount = Object.entries(reactionDist)
    .filter(([key]) => key !== "none")
    .reduce((acc, [, v]) => acc + v, 0);

  /* ================= SUMMARY ================= */

  const summary = {
    totalMedicines: medicines.length,
    avgMedicinesPerDay:
      daily.length > 0
        ? medicines.length / daily.length
        : 0,

    mostCommonMedicine,
    mostCommonReason,
    mostCommonMethod,

    mostCommonHour:
      mostCommonHour !== null ? Number(mostCommonHour) : null,

    averageDose:
      doseCount > 0 ? totalDose / doseCount : null,

    avgIntervalMinutes:
      avgInterval !== null ? Math.round(avgInterval) : null,

    reactionsDetected: reactionCount,
  };

  /* ================= SAFETY ALERTS ================= */

  const alerts: {
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
  }[] = [];

  if (reactionCount > 0) {
    alerts.push({
      type: "reaction",
      severity: "medium",
      message: "Possible medicine reactions recorded.",
    });
  }

  if (avgInterval && avgInterval < 120) {
    alerts.push({
      type: "frequency",
      severity: "high",
      message: "Medicine doses may be too frequent.",
    });
  }

  if (medicines.length > daily.length * 4) {
    alerts.push({
      type: "frequency",
      severity: "medium",
      message: "High medicine frequency detected.",
    });
  }

  /* ================= RETURN ================= */

  return {
    daily,
    summary,
    distributions: {
      medicineName: medicineNameDist,
      reason: reasonDist,
      reaction: reactionDist,
      method: methodDist,
      hourOfDay: hourDist,
    },
    alerts,
  };
}
