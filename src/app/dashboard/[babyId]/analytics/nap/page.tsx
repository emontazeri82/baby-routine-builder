"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import { useMemo } from "react";

/* ================= TYPES ================= */

type NapResponse = {
  daily: {
    date: string;
    naps: number;
    assisted: number;
  }[];
  summary: {
    totalNaps: number;
    avgNapsPerDay: number;
    assistedCount: number;
    assistedRatioPercent: number;
    mostCommonLocation: string | null;
    mostCommonQuality: string | null;
  };
};

/* ================= HELPERS ================= */

async function fetchAnalytics<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to load nap analytics");
  }

  return res.json();
}

/* ================= COMPONENT ================= */

export default function NapAnalyticsPage() {
  const params = useParams();
  const babyId = params.babyId as string;

  const searchParams = useSearchParams();

  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  /* -------- Query -------- */

  const {
    data,
    isLoading,
    isError,
  } = useQuery<NapResponse>({
    queryKey: ["nap-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<NapResponse>(
        `/api/analytics/nap?babyId=${babyId}&days=${days}`
      ),
  });

  const summary = data?.summary;

  const daily = useMemo(() => data?.daily ?? [], [data?.daily]);

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map((d) => d.naps), 1);
  }, [daily]);

  if (isLoading) {
    return <div className="p-6">Loading nap analytics...</div>;
  }

  if (isError || !summary) {
    return <div className="p-6">Failed to load nap analytics.</div>;
  }

  /* ================= INSIGHTS ================= */

  const insights: string[] = [];

  if (summary.avgNapsPerDay < 2) {
    insights.push("📉 Low nap frequency detected.");
  }

  if (summary.assistedRatioPercent > 60) {
    insights.push("🛌 Baby often requires assisted sleep.");
  }

  if (summary.mostCommonLocation === "stroller") {
    insights.push("🚶 Most naps occur in stroller.");
  }

  if (summary.mostCommonQuality === "poor") {
    insights.push("⚠️ Nap quality may be poor recently.");
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-3xl font-bold">Nap Analytics</h1>

      <RangePresetSelector />

      {/* INSIGHTS */}

      {insights.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold">
              Smart Insights
            </h2>

            {insights.map((i, index) => (
              <p
                key={index}
                className="text-sm text-neutral-600"
              >
                {i}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* SUMMARY */}

      <h2 className="text-xl font-semibold">
        Nap Overview
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total Naps
            </p>

            <p className="text-2xl font-bold">
              {summary.totalNaps}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Avg Naps / Day
            </p>

            <p className="text-2xl font-bold">
              {summary.avgNapsPerDay.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Assisted Sleep
            </p>

            <p className="text-2xl font-bold">
              {summary.assistedRatioPercent.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Most Common Location
            </p>

            <p className="text-2xl font-bold capitalize">
              {summary.mostCommonLocation ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Most Common Quality
            </p>

            <p className="text-2xl font-bold capitalize">
              {summary.mostCommonQuality ?? "—"}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* TREND */}

      <Card>
        <CardContent>
          <h2 className="font-semibold">
            {days}-Day Nap Trend
          </h2>

          <p className="text-sm text-neutral-500 mb-4">
            Each bar represents naps per day.
          </p>

          <div className="flex justify-between text-xs text-neutral-400 mb-2">
            <span>0</span>
            <span>Max: {maxDaily} naps</span>
          </div>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-48 min-w-[560px]">

              {daily.map((d, index) => {
                const heightPercent =
                  (d.naps / maxDaily) * 100;

                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center min-w-8 flex-1"
                  >
                    <div
                      className="w-full bg-indigo-500 rounded-t-md min-h-[4px]"
                      style={{
                        height:
                          heightPercent === 0
                            ? "4px"
                            : `${heightPercent}%`,
                      }}
                    />

                    <p className="text-xs mt-2 text-neutral-500 h-4">
                      {d.date.slice(5)}
                    </p>
                  </div>
                );
              })}

            </div>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}