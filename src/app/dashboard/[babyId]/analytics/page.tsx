
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

import {
  Moon,
  Utensils,
  Ruler,
  Baby,
  Gamepad2,
  Bath,
  Pill,
  Thermometer,
  Clock,
  Droplets,
} from "lucide-react";

import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
/* ================= TYPES ================= */
const navItems = [
  { label: "Sleep", icon: Moon, path: "sleep" },
  { label: "Feeding", icon: Utensils, path: "feeding" },
  { label: "Growth", icon: Ruler, path: "growth" },
  { label: "Diaper", icon: Baby, path: "diaper" },
  { label: "Play", icon: Gamepad2, path: "play" },
  { label: "Bath", icon: Bath, path: "bath" },
  { label: "Medicine", icon: Pill, path: "medicine" },
  { label: "Temp", icon: Thermometer, path: "temperature" },
  { label: "Nap", icon: Clock, path: "nap" },
  { label: "Pump", icon: Droplets, path: "pumping" },
];

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
  daily: unknown[];
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

type PlayResponse = {
  summary: {
    totalSessions: number;
    totalMinutes: number;
    averageMinutes: number;
    mostCommonPlayType: string | null;
    mostActiveHour: number | null;
  };
  distributions: {
    playType: Record<string, number>;
    location: Record<string, number>;
    mood: Record<string, number>;
    intensity: Record<string, number>;
    skills: Record<string, number>;
    hourOfDay: Record<number, number>;
  };
};

type BathResponse = {
  daily: {
    date: string;
    totalBaths: number;
  }[];
  summary: {
    totalBaths: number;
    averageBathsPerDay: number;
    weeklyFrequency: number;
    mostCommonBathHour: number | null;
    averageTemperature: number | null;
    moodImproved: number;
    moodWorsened: number;
  };
  distributions: {
    bathType: Record<string, number>;
    location: Record<string, number>;
    moodBefore: Record<string, number>;
    moodAfter: Record<string, number>;
    hourOfDay: Record<number, number>;
  };
};

type MedicineResponse = {
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

type TemperatureResponse = {
  daily: {
    date: string;
    avgTemperature: number | null;
    maxTemperature: number | null;
  }[];
  summary: {
    avgTemperature: number | null;
    maxTemperature: number | null;
    minTemperature: number | null;
    feverCount: number;
    highFeverCount: number;
    mostCommonHour: number | null;
  };
};

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

type PumpingResponse = {
  daily: {
    date: string;
    sessions: number;
    totalAmount: number;
  }[];
  summary: {
    totalSessions: number;
    totalAmountMl: number;
    avgAmountPerSessionMl: number;
    avgDurationMinutes: number;
    mostCommonSide: "left" | "right" | "both" | null;
    mostCommonHour: number | null;
    painRatioPercent: number;
  };
  distributions: {
    side: Record<string, number>;
    hourOfDay: Record<number, number>;
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

  /* -------- Play Query -------- */

  const {
    data: playData,
    isLoading: playLoading,
    isError: playError,
  } = useQuery<PlayResponse>({
    queryKey: ["play-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<PlayResponse>(
        `/api/analytics/play?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Bath Query -------- */

  const {
    data: bathData,
    isLoading: bathLoading,
    isError: bathError,
  } = useQuery<BathResponse>({
    queryKey: ["bath-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<BathResponse>(
        `/api/analytics/bath?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Medicine Query -------- */

  const {
    data: medicineData,
    isLoading: medicineLoading,
    isError: medicineError,
  } = useQuery<MedicineResponse>({
    queryKey: ["medicine-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<MedicineResponse>(
        `/api/analytics/medicine?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Temperature Query -------- */

  const {
    data: temperatureData,
    isLoading: temperatureLoading,
    isError: temperatureError,
  } = useQuery<TemperatureResponse>({
    queryKey: ["temperature-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<TemperatureResponse>(
        `/api/analytics/temperature?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Nap Query -------- */

  const {
    data: napData,
    isLoading: napLoading,
    isError: napError,
  } = useQuery<NapResponse>({
    queryKey: ["nap-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<NapResponse>(
        `/api/analytics/nap?babyId=${babyId}&days=${days}`
      ),
  });

  /* -------- Pumping Query -------- */

  const {
    data: pumpingData,
    isLoading: pumpingLoading,
    isError: pumpingError,
  } = useQuery<PumpingResponse>({
    queryKey: ["pumping-analytics", babyId, days],
    queryFn: () =>
      fetchAnalytics<PumpingResponse>(
        `/api/analytics/pumping?babyId=${babyId}&days=${days}`
      ),
    staleTime: 1000 * 60 * 5,
  });


  /* -------- Loading / Error -------- */

  const sleepSummary = sleepData?.summary;
  const feedingSummary = feedingData?.summary; // ✅ ADD THIS
  const growthSummary = growthData?.summary;
  const diaperSummary = diaperData?.summary;
  const playSummary = playData?.summary;
  const bathSummary = bathData?.summary;
  const medicineSummary = medicineData?.summary;
  const temperatureSummary = temperatureData?.summary;
  const napSummary = napData?.summary;
  const pumpingSummary = pumpingData?.summary;
  const diaperDaily = useMemo(() => diaperData?.daily ?? [], [diaperData?.daily]);
  const daily = useMemo(() => sleepData?.daily ?? [], [sleepData?.daily]);

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map(d => d.totalMinutes), 1);
  }, [daily]);

  const maxDiaper = useMemo(() => {
    return Math.max(...diaperDaily.map(d => d.total), 1);
  }, [diaperDaily]);

  if (sleepLoading ||
    feedingLoading ||
    growthLoading ||
    diaperLoading ||
    playLoading ||
    bathLoading ||
    medicineLoading ||
    temperatureLoading ||
    napLoading ||
    pumpingLoading
  ) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (
    sleepError ||
    feedingError ||
    growthError ||
    diaperError ||
    playError ||
    bathError ||
    medicineError ||
    temperatureError ||
    napError ||
    pumpingError ||
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

  // Play insights
  if (playSummary && playSummary.averageMinutes < 5) {
    insights.push("🎮 Very short play sessions detected.");
  }

  if (playSummary && playSummary.totalSessions < days) {
    insights.push("🧸 Play sessions may be less frequent than expected.");
  }

  // Bath insights
  if (bathSummary && bathSummary.weeklyFrequency < 3) {
    insights.push("🛁 Bath routine may be less frequent.");
  }

  if (bathSummary && bathSummary.moodImproved > bathSummary.moodWorsened) {
    insights.push("😊 Baby mood often improves after bath.");
  }

  if (bathSummary && bathSummary.mostCommonBathHour !== null) {
    insights.push(
      `🛁 Baths usually happen around ${bathSummary.mostCommonBathHour}:00.`
    );
  }

  // Medicine insights
  if (medicineSummary && medicineSummary.reactionsDetected > 0) {
    insights.push("💊 Possible medicine reactions were recorded.");
  }
  if (
    medicineSummary &&
    medicineSummary.avgIntervalMinutes !== null &&
    medicineSummary.avgIntervalMinutes < 120
  ) {
    insights.push("⏱ Medicine doses may be too close together.");
  }
  // Temperature insights
  if (temperatureSummary?.feverCount && temperatureSummary.feverCount > 0) {
    insights.push(`🌡 Fever detected ${temperatureSummary.feverCount} times.`);
  }

  if (
    temperatureSummary?.highFeverCount &&
    temperatureSummary.highFeverCount > 0
  ) {
    insights.push("🚨 High fever detected.");
  }
  // Nap insights
  if (napSummary && napSummary.avgNapsPerDay < 2) {
    insights.push("😴 Low nap frequency detected.");
  }

  if (napSummary && napSummary.assistedRatioPercent > 60) {
    insights.push("🛌 Baby often requires assisted sleep for naps.");
  }

  if (napSummary?.mostCommonQuality === "poor") {
    insights.push("⚠️ Many naps recorded with poor quality.");
  }
  /* -------- Pumping Insights -------- */

  if (pumpingSummary && pumpingSummary.painRatioPercent > 20) {
    insights.push("⚠️ Pumping discomfort reported frequently.");
  }

  if (pumpingSummary && pumpingSummary.avgAmountPerSessionMl < 30) {
    insights.push("🍼 Pumping output per session may be low.");
  }

  if (pumpingSummary && pumpingSummary.totalSessions < days) {
    insights.push("⏱ Pumping sessions may be less frequent than expected.");
  }

  if (pumpingSummary && pumpingSummary.mostCommonHour !== null) {
    insights.push(
      `🕒 Pumping most often happens around ${pumpingSummary.mostCommonHour}:00.`
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Baby Analytics
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track patterns, insights, and daily trends
          </p>
        </div>

        <div className="bg-white border rounded-xl px-4 py-2 shadow-sm">
          <RangePresetSelector />
        </div>
      </div>
      {/* ================= QUICK NAV ================= */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-neutral-500 mb-3">
          Quick Navigation
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.path}
                variant="outline"
                size="sm"
                className="
                    flex items-center justify-start gap-2
                    hover:bg-blue-50 hover:border-blue-400 active:scale-[0.98]
                    hover:shadow-sm hover:-translate-y-[1px]
                    transition-all duration-200
                  "
                onClick={() =>
                  router.push(
                    `/dashboard/${babyId}/analytics/${item.path}?days=${days}`
                  )
                }
              >
                <Icon size={16} className="text-blue-500" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
      {/* INSIGHTS */}
      {insights.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
          <CardContent className="space-y-2 p-5">
            <h2 className="text-lg font-semibold text-blue-900">Smart Insights</h2>
            {insights.map((i, index) => (
              <p key={index} className="text-sm text-neutral-600">
                {i}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ================= SLEEP SECTION ================= */}
      <div className="space-y-4 bg-blue-50/40 backdrop-blur-md p-5 rounded-2xl border border-blue-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Sleep Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <Card className="hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 border border-neutral-200">
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg Daily Sleep</p>
              <p className="text-2xl font-bold">
                {formatHours(sleepSummary.avgDailyMinutes)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 border border-neutral-200">
            <CardContent>
              <p className="text-sm text-muted-foreground">Night Ratio</p>
              <p className="text-2xl font-bold">
                {sleepSummary.nightRatioPercent.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 border-red-200 bg-red-50 border-neutral-200">
            <CardContent>
              <p className="text-sm text-muted-foreground">Sleep Debt</p>
              <p className="text-2xl font-bold text-red-600">
                {formatHours(sleepSummary.sleepDebtMinutes)}
              </p>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ================= NAP SECTION ================= */}
      <div className="space-y-4 bg-indigo-50/40 backdrop-blur-md p-5 rounded-2xl border border-indigo-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Nap Overview
        </h2>

        {napSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Naps</p>
                <p className="text-2xl font-bold">{napSummary.totalNaps}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Avg Naps / Day</p>
                <p className="text-2xl font-bold">
                  {napSummary.avgNapsPerDay.toFixed(1)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Assisted Sleep</p>
                <p className="text-2xl font-bold">
                  {napSummary.assistedRatioPercent.toFixed(0)}%
                </p>
              </CardContent>
            </Card>

          </div>
        ) : (
          <p className="text-gray-500">No nap records yet.</p>
        )}
      </div>

      {/* ================= FEEDING SECTION ================= */}
      <div className="space-y-4 bg-green-50/40 backdrop-blur-md p-5 rounded-2xl border border-green-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Feeding Overview
        </h2>

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
      </div>
      {/* ================= GROWTH SECTION ================= */}
      <div className="space-y-4 bg-purple-50/40 backdrop-blur-md p-5 rounded-2xl border border-purple-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Growth Overview
        </h2>

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
      </div>
      {/* ================= DIAPER SECTION ================= */}
      <div className="space-y-4 bg-amber-50/40 backdrop-blur-md p-5 rounded-2xl border border-amber-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Diaper Overview
        </h2>

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
      </div>
      {/* ================= PLAY SECTION ================= */}
      <div className="space-y-4 bg-pink-50/40 backdrop-blur-md p-5 rounded-2xl border border-pink-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Play Overview
        </h2>

        {playSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Play Sessions</p>
                <p className="text-2xl font-bold">
                  {playSummary.totalSessions}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Play Time</p>
                <p className="text-2xl font-bold">
                  {formatMinutes(playSummary.totalMinutes)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Session</p>
                <p className="text-2xl font-bold">
                  {formatMinutes(playSummary.averageMinutes)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Most Common Play Type</p>
                <p className="text-2xl font-bold capitalize">
                  {playSummary.mostCommonPlayType ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Most Active Play Hour</p>
                <p className="text-2xl font-bold">
                  {playSummary.mostActiveHour !== null
                    ? `${playSummary.mostActiveHour}:00`
                    : "—"}
                </p>
              </CardContent>
            </Card>

          </div>
        ) : (
          <p className="text-gray-500">No play records yet.</p>
        )}
      </div>
      {/* ================= BATH SECTION ================= */}
      <div className="space-y-4 bg-cyan-50/40 backdrop-blur-md p-5 rounded-2xl border border-cyan-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Bath Overview
        </h2>

        {bathSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Baths</p>
                <p className="text-2xl font-bold">
                  {bathSummary.totalBaths}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Baths / Day</p>
                <p className="text-2xl font-bold">
                  {bathSummary.averageBathsPerDay.toFixed(1)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Weekly Frequency</p>
                <p className="text-2xl font-bold">
                  {bathSummary.weeklyFrequency}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Most Common Bath Time</p>
                <p className="text-2xl font-bold">
                  {bathSummary.mostCommonBathHour !== null
                    ? `${bathSummary.mostCommonBathHour}:00`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Temperature</p>
                <p className="text-2xl font-bold">
                  {bathSummary.averageTemperature ?? "—"}°
                </p>
              </CardContent>
            </Card>

          </div>
        ) : (
          <p className="text-gray-500">No bath records yet.</p>
        )}
      </div>
      {/* ================= MEDICINE SECTION ================= */}
      <div className="space-y-4 bg-red-50/40 backdrop-blur-md p-5 rounded-2xl border border-red-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Medicine Overview
        </h2>

        {medicineSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Medicines</p>
                <p className="text-2xl font-bold">{medicineSummary.totalMedicines}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average / Day</p>
                <p className="text-2xl font-bold">
                  {medicineSummary.avgMedicinesPerDay.toFixed(1)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Most Common Medicine</p>
                <p className="text-2xl font-bold">
                  {medicineSummary.mostCommonMedicine ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Avg Dose Interval</p>
                <p className="text-2xl font-bold">
                  {medicineSummary.avgIntervalMinutes !== null
                    ? `${medicineSummary.avgIntervalMinutes} min`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Detected Reactions</p>
                <p className="text-2xl font-bold">{medicineSummary.reactionsDetected}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-gray-500">No medicine records yet.</p>
        )}
      </div>
      {/* ================= TEMPERATURE SECTION ================= */}
      <div className="space-y-4 bg-orange-50/40 backdrop-blur-md p-5 rounded-2xl border border-orange-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Temperature Overview
        </h2>

        {temperatureSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Temperature</p>
                <p className="text-2xl font-bold">
                  {temperatureSummary.avgTemperature != null
                    ? `${temperatureSummary.avgTemperature.toFixed(1)}°`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Highest Temperature</p>
                <p className="text-2xl font-bold">
                  {temperatureSummary.maxTemperature != null
                    ? `${temperatureSummary.maxTemperature.toFixed(1)}°`
                    : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Fever Count</p>
                <p className="text-2xl font-bold">{temperatureSummary.feverCount}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-gray-500">No temperature records yet.</p>
        )}
      </div>
      {/* ================= PUMPING SECTION ================= */}
      <div className="space-y-4 bg-teal-50/40 backdrop-blur-md p-5 rounded-2xl border border-teal-100 shadow-md animate-[fadeInUp_0.4s_ease-out]">
        <h2 className="text-xl font-semibold text-neutral-800 border-l-4 border-blue-500 pl-3">
          Pumping Overview
        </h2>

        {pumpingSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{pumpingSummary.totalSessions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Milk</p>
                <p className="text-2xl font-bold">
                  {pumpingSummary.totalAmountMl} ml
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Pump</p>
                <p className="text-2xl font-bold">
                  {pumpingSummary.avgAmountPerSessionMl} ml
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Average Duration</p>
                <p className="text-2xl font-bold">
                  {pumpingSummary.avgDurationMinutes} min
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Most Common Side</p>
                <p className="text-2xl font-bold capitalize">
                  {pumpingSummary.mostCommonSide ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Discomfort Ratio</p>
                <p className="text-2xl font-bold">
                  {pumpingSummary.painRatioPercent}%
                </p>
              </CardContent>
            </Card>

          </div>
        ) : (
          <p className="text-gray-500">No pumping records yet.</p>
        )}
      </div>
      {/* ================= SLEEP TREND ================= */}
      {/*<div className="space-y-4 bg-white p-5 rounded-xl border shadow-sm">
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
      </div>/*}
      {/* ================= DIAPER TREND ================= */}
      {/*<div className="space-y-4 bg-white p-5 rounded-xl border shadow-sm">
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
      </div>*/}
    </div>
  );
}
