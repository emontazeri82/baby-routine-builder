
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

/* ================= TYPES ================= */

type SleepResponse = {
  daily: {
    date: string;
    totalMinutes: number;
    nightMinutes: number;
  }[];
  summary: {
    totalSleepMinutes: number;
    avgDailyMinutes: number;
    avgNightMinutesPerDay: number;
    avgDaytimeMinutesPerDay: number;
    longestStretchMinutes: number;
    avgSleepSessionMinutes: number;
    shortestNapMinutes: number;
    avgNapMinutes: number;
    napCount: number;
    sleepSessionCount: number;
    nightSleepMinutes: number;
    nightRatioPercent: number;
    consistencyScore: number;
    bestSleepDay: string | null;
    worstSleepDay: string | null;
    sleepDebtMinutes: number;
    avgBedtimeMinutes: number;
    avgWakeTimeMinutes: number;
    timezone?: string;
  };
};

type FeedingResponse = {
  daily: any[];
  summary: {
    totalFeeds: number;
    avgFeedsPerDay: number;
    avgIntakePerDayMl: number;
    avgIntervalMinutes: number;
    longestGapMinutes: number;
    avgFeedDurationMinutes: number;
    nightFeedsCount: number;
    nightFeedRatioPercent: number;
    feedingConsistencyScore: number;
    clusterFeedingDetected: boolean;
  };
};

/* ================= HELPERS ================= */

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ================= COMPONENT ================= */

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const babyId = params.babyId as string;
  const [days, setDays] = useState(7);

  /* -------- Sleep Query -------- */

  const {
    data: sleepData,
    isLoading: sleepLoading,
    isError: sleepError,
  } = useQuery<SleepResponse>({
    queryKey: ["sleep-analytics-full", babyId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/sleep?babyId=${babyId}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  /* -------- Feeding Query -------- */

  const {
    data: feedingData,
    isLoading: feedingLoading,
    isError: feedingError,
  } = useQuery<FeedingResponse>({
    queryKey: ["feeding-analytics", babyId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/feeding?babyId=${babyId}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  /* -------- Loading / Error -------- */

  const sleepSummary = sleepData?.summary;
  const feedingSummary = feedingData?.summary; // ✅ ADD THIS
  const daily = sleepData?.daily ?? [];

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map(d => d.totalMinutes), 1);
  }, [daily]);

  if (sleepLoading || feedingLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (
    sleepError ||
    feedingError ||
    !sleepSummary ||
    !feedingSummary
  ) {
    return <div className="p-6">Failed to load analytics data.</div>;
  }


  /* ================= INSIGHTS ================= */

  const insights: string[] = [];

  // Sleep insights
  if (sleepSummary.sleepDebtMinutes > 120) {
    insights.push("⚠️ Possible sleep deficit detected.");
  }

  if (sleepSummary.consistencyScore < 70) {
    insights.push("📉 Sleep schedule may be inconsistent.");
  }

  if (sleepSummary.nightRatioPercent < 60) {
    insights.push("🌙 Low night sleep ratio compared to total sleep.");
  }

  // Feeding insights
  if (feedingSummary.clusterFeedingDetected) {
    insights.push("🍼 Cluster feeding pattern detected.");
  }

  if (feedingSummary.nightFeedsCount > 3) {
    insights.push("🌙 High number of night feeds.");
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-3xl font-bold">Baby Analytics</h1>
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="border rounded px-2 py-1"
      >
        <option value={7}>Last 7 Days</option>
        <option value={14}>Last 14 Days</option>
        <option value={30}>Last 30 Days</option>
        <option value={60}>Last 60 Days</option>
      </select>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold">Smart Insights</h2>
            {insights.map((i, index) => (
              <p key={index} className="text-sm text-neutral-600">
                {i}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ================= SLEEP SECTION ================= */}

      <h2 className="text-xl font-semibold">Sleep Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Daily Sleep</p>
            <p className="text-2xl font-bold">
              {formatHours(sleepSummary.avgDailyMinutes)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Night Ratio</p>
            <p className="text-2xl font-bold">
              {sleepSummary.nightRatioPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sleep Debt</p>
            <p className="text-2xl font-bold text-red-600">
              {formatHours(sleepSummary.sleepDebtMinutes)}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ================= FEEDING SECTION ================= */}

      <h2 className="text-xl font-semibold">Feeding Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Feeds / Day</p>
            <p className="text-2xl font-bold">
              {feedingSummary.avgFeedsPerDay.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Intake / Day</p>
            <p className="text-2xl font-bold">
              {Math.round(feedingSummary.avgIntakePerDayMl)} ml
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Consistency Score</p>
            <p className="text-2xl font-bold">
              {feedingSummary.feedingConsistencyScore.toFixed(0)} / 100
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ================= SLEEP TREND ================= */}

      <Card>
        <CardContent>
          <h2 className="font-semibold mb-4">{days}-Day Sleep Trend</h2>

          <div className="flex items-end gap-3 h-48">
            {daily.map(d => {
              const heightPercent =
                (d.totalMinutes / maxDaily) * 100;

              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center w-full"
                >
                  <div
                    className="w-full bg-sky-500 rounded-t-md"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <p className="text-xs mt-2">
                    {d.date.slice(5)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ================= NAVIGATION ================= */}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/${babyId}/analytics/sleep`)
          }
        >
          View Sleep Details →
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/${babyId}/analytics/feeding`)
          }
        >
          View Feeding Details →
        </Button>
      </div>

    </div>
  );
}
