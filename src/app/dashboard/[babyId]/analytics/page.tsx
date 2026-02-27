
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
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
type GrowthResponse = {
  records: {
    date: string;
    weight: number | null;
    height: number | null;
    headCircumference: number | null;
  }[];
  summary: {
    latestWeight: number | null;
    latestHeight: number | null;
    latestHead: number | null;
    totalWeightGain: number | null;
  };
};

type DiaperResponse = {
  daily: {
    date: string;
    total: number;
    wet: number;
    dirty: number;
    watery: number;
    hard: number;
    rash: number;
  }[];
  summary: {
    avgTotal: number;
    avgWet: number;
    avgDirty: number;
    avgRash: number;
    avgWatery: number;
    avgHard: number;
  } | null;
  alerts: {
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
  }[];
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

async function fetchAnalytics<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

/* ================= COMPONENT ================= */

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const babyId = params.babyId as string;

  const searchParams = useSearchParams();
  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  /* -------- Sleep Query -------- */

  const {
    data: sleepData,
    isLoading: sleepLoading,
    isError: sleepError,
  } = useQuery<SleepResponse>({
    queryKey: ["sleep-analytics-full", babyId, days],
    queryFn: () =>
      fetchAnalytics<SleepResponse>(
        `/api/analytics/sleep?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Feeding Query -------- */

  const {
    data: feedingData,
    isLoading: feedingLoading,
    isError: feedingError,
  } = useQuery<FeedingResponse>({
    queryKey: ["feeding-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<FeedingResponse>(
        `/api/analytics/feeding?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Growth Query -------- */

  const {
    data: growthData,
    isLoading: growthLoading,
    isError: growthError,
  } = useQuery<GrowthResponse>({
    queryKey: ["growth-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<GrowthResponse>(
        `/api/analytics/growth?babyId=${babyId}&days=${days}`
      ),
  });
  /* -------- Diaper Query -------- */

  const {
    data: diaperData,
    isLoading: diaperLoading,
    isError: diaperError,
  } = useQuery<DiaperResponse>({
    queryKey: ["diaper-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<DiaperResponse>(
        `/api/analytics/diaper?babyId=${babyId}&days=${days}`
      ),
  });


  /* -------- Loading / Error -------- */

  const sleepSummary = sleepData?.summary;
  const feedingSummary = feedingData?.summary; // ✅ ADD THIS
  const growthSummary = growthData?.summary;
  const diaperSummary = diaperData?.summary;
  const diaperDaily = diaperData?.daily ?? [];
  const daily = sleepData?.daily ?? [];

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map(d => d.totalMinutes), 1);
  }, [daily]);

  const maxDiaper = useMemo(() => {
    return Math.max(...diaperDaily.map(d => d.total), 1);
  }, [diaperDaily]);

  if (sleepLoading ||
    feedingLoading ||
    growthLoading ||
    diaperLoading
  ) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (
    sleepError ||
    feedingError ||
    growthError ||
    diaperError ||
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
  // Diaper insights
  if (diaperSummary?.avgWet != null && diaperSummary.avgWet < 3) {
    insights.push("💧 Low average wet diaper frequency.");
  }

  if (diaperSummary?.avgWatery != null && diaperSummary.avgWatery > 1) {
    insights.push("💩 Frequent watery stools detected.");
  }

  if (diaperSummary?.avgRash != null && diaperSummary.avgRash > 1) {
    insights.push("🔴 Frequent diaper rash occurrences.");
  }
  diaperData?.alerts?.forEach((alert) => {
    insights.push(`🚨 ${alert.message}`);
  });


  /* ================= RENDER ================= */

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-3xl font-bold">Baby Analytics</h1>

      <RangePresetSelector />

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
      {/* ================= GROWTH SECTION ================= */}

      <h2 className="text-xl font-semibold">Growth Overview</h2>

      {growthSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Latest Weight</p>
              <p className="text-2xl font-bold">
                {growthSummary.latestWeight != null
                  ? `${growthSummary.latestWeight.toFixed(2)} kg`
                  : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Latest Height</p>
              <p className="text-2xl font-bold">
                {growthSummary.latestHeight != null
                  ? `${growthSummary.latestHeight.toFixed(1)} cm`
                  : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Head Circumference</p>
              <p className="text-2xl font-bold">
                {growthSummary.latestHead != null
                  ? `${growthSummary.latestHead.toFixed(1)} cm`
                  : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total Weight Gain</p>
              <p className="text-2xl font-bold">
                {growthSummary.totalWeightGain != null
                  ? `${growthSummary.totalWeightGain.toFixed(2)} kg`
                  : "—"}
              </p>
            </CardContent>
          </Card>

        </div>
      ) : (
        <p className="text-gray-500">No growth records yet.</p>
      )}

      {/* ================= DIAPER SECTION ================= */}

      <h2 className="text-xl font-semibold">Diaper Overview</h2>

      {diaperSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg Diapers / Day</p>
              <p className="text-2xl font-bold">
                {diaperSummary.avgTotal.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg Wet / Day</p>
              <p className="text-2xl font-bold">
                {diaperSummary.avgWet.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg Dirty / Day</p>
              <p className="text-2xl font-bold">
                {diaperSummary.avgDirty.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg Rash / Day</p>
              <p className="text-2xl font-bold">
                {diaperSummary.avgRash.toFixed(1)}
              </p>
            </CardContent>
          </Card>

        </div>
      ) : (
        <p className="text-gray-500">No diaper records yet.</p>
      )}

      {/* ================= SLEEP TREND ================= */}

      <Card>
        <CardContent>
          <h2 className="font-semibold">
            {days}-Day Sleep Trend
          </h2>
          <p className="text-sm text-neutral-500 mb-4">
            Each bar represents total sleep duration for that day.
          </p>
          <div className="flex justify-between text-xs text-neutral-400 mb-2">
            <span>0</span>
            <span>Max: {formatHours(maxDaily)}</span>
          </div>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-48 min-w-[560px]">
              {daily.map((d, index) => {
                const labelStep = Math.max(
                  1,
                  Math.ceil(daily.length / 8)
                );
                const showLabel =
                  index % labelStep === 0 ||
                  index === daily.length - 1;

                const heightPercent =
                  (d.totalMinutes / maxDaily) * 100;

                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center min-w-8 flex-1"
                  >
                    <div
                      className="w-full bg-sky-500 rounded-t-md min-h-[4px]"
                      style={{
                        height:
                          heightPercent === 0
                            ? "4px"
                            : `${heightPercent}%`,
                      }}
                    />
                    <p className="text-xs mt-2 text-neutral-500 h-4">
                      {showLabel ? d.date.slice(5) : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= DIAPER TREND ================= */}

      <Card>
        <CardContent>
          <h2 className="font-semibold">
            {days}-Day Diaper Trend
          </h2>
          <p className="text-sm text-neutral-500 mb-4">
            Each bar represents total diaper changes for that day.
          </p>
          <div className="flex justify-between text-xs text-neutral-400 mb-2">
            <span>0</span>
            <span>Max: {maxDiaper} diapers</span>
          </div>

          {diaperDaily.length === 0 ? (
            <p className="text-gray-500">
              No diaper data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-48 min-w-[560px]">
                {diaperDaily.map((d) => {
                  const heightPercent = (d.total / maxDiaper) * 100;

                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center min-w-8 flex-1"
                    >
                      <div
                        className="w-full bg-emerald-500 rounded-t-md min-h-[4px]"
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
          )}
        </CardContent>
      </Card>

      {/* ================= NAVIGATION ================= */}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              `/dashboard/${babyId}/analytics/sleep?days=${days}`
            )
          }
        >
          View Sleep Details →
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            router.push(
              `/dashboard/${babyId}/analytics/feeding?days=${days}`
            )
          }
        >
          View Feeding Details →
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/${babyId}/analytics/growth?days=${days}`)
          }
        >
          View Growth Details →
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              `/dashboard/${babyId}/analytics/diaper?days=${days}`
            )
          }
        >
          View Diaper Details →
        </Button>
      </div>
    </div>
  );
}
