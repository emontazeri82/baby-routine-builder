"use client";

import { useEffect, useState } from "react";

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

type PumpingDistributions = {
  side: Record<string, number>;
  hourOfDay: Record<number, number>;
};

type PumpingDaily = {
  date: string;
  sessions: number;
  totalAmount: number;
};

export type PumpingAnalytics = {
  summary: PumpingSummary;
  distributions: PumpingDistributions;
  daily: PumpingDaily[];
};

export function usePumpingAnalytics(params: {
  babyId?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}) {

  const [data, setData] = useState<PumpingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    if (!params.babyId) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();

        query.set("babyId", params.babyId!);

        if (params.days) query.set("days", String(params.days));
        if (params.startDate) query.set("startDate", params.startDate);
        if (params.endDate) query.set("endDate", params.endDate);

        const res = await fetch(
          `/api/analytics/pumping?${query.toString()}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch pumping analytics");
        }

        const json = await res.json();

        setData(json);

      } catch (err: any) {

        if (err.name === "AbortError") return;

        console.error("PUMPING ANALYTICS HOOK ERROR:", err);

        setError(err.message ?? "Unknown error");

      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();

  }, [params.babyId, params.days, params.startDate, params.endDate]);

  return {
    data,
    loading,
    error,
  };
}