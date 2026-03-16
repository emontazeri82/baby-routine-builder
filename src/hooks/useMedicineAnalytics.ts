"use client";

import { useQuery } from "@tanstack/react-query";

export type MedicineAnalyticsResponse = {
  daily: {
    date: string;
    totalMedicines: number;
  }[];

  summary: {
    totalMedicines: number;
    avgMedicinesPerDay: number;
    mostCommonMedicine: string | null;
    mostCommonReason: string | null;
    mostCommonMethod: string | null;
    mostCommonHour: number | null;
    averageDose: number | null;
    avgIntervalMinutes: number | null;
    reactionsDetected: number;
  };

  distributions: {
    medicineName: Record<string, number>;
    reason: Record<string, number>;
    reaction: Record<string, number>;
    method: Record<string, number>;
    hourOfDay: Record<number, number>;
  };

  alerts: {
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
  }[];
};

async function fetchMedicineAnalytics(
  babyId: string,
  days: number
): Promise<MedicineAnalyticsResponse> {
  const res = await fetch(
    `/api/analytics/medicine?babyId=${babyId}&days=${days}`
  );

  if (!res.ok) {
    throw new Error("Failed to load medicine analytics");
  }

  return res.json();
}

export function useMedicineAnalytics(
  babyId: string,
  days: number = 7
) {
  const query = useQuery({
    queryKey: ["medicine-analytics", babyId, days],
    queryFn: () => fetchMedicineAnalytics(babyId, days),
    enabled: !!babyId,
    staleTime: 1000 * 60 * 5,
  });

  const summary = query.data?.summary;
  const daily = query.data?.daily ?? [];
  const distributions = query.data?.distributions;
  const alerts = query.data?.alerts ?? [];

  return {
    ...query,
    summary,
    daily,
    distributions,
    alerts,
  };
}