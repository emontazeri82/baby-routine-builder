import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { startOfDay, subDays } from "date-fns";

import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import DashboardActivity from "@/components/dashboard/DashboardActivity";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import { generateDashboardInsights } from "@/lib/insights";
import type { DashboardInsight } from "@/lib/insights/types";
import { withAnalyticsCache } from "@/lib/cache/analyticsCache";
import DashboardStats from "@/components/dashboard/DashboardStats";

import {
  getGrowthSummary,
  getFeedingSummary,
  getSleepSummary,
  getDiaperSummary,
  getPlayAnalytics,
  getBathAnalytics,
  getMedicineAnalytics,
  getTemperatureAnalytics,
  getNapAnalytics,
  getPumpingAnalytics,
} from "@/services/analytics";

import {
  getUserBabies,
  getRecentActivities,
  getUpcomingReminders,
  getTodayActivities,
} from "@/lib/dashboard/dashboardQueries";

import convertInsightsToMessages from "@/lib/assistant/adapters/insightAdapter";
import { normalizeMessages } from "@/lib/assistant/assistant.rules/normalizeMessages";
import { toDashboardInsights } from "@/lib/assistant/adapters/dashboardInsightAdapter";
/** Always fresh dashboard data (avoids stale RSC/cache when iterating on UI). */
export const dynamic = "force-dynamic";

/* =========================
   🔥 DEBUG HELPERS
========================= */
type Baby = {
  id: string;
  name: string;
  birthDate?: Date | null;
  gender?: string | null;
  photoUrl?: string | null;
};

const activeTimers = new Set<string>();

function logStep(label: string) {
  if (activeTimers.has(label)) {
    console.warn(`⚠️ Timer already started: ${label}`);
    return;
  }

  console.log(`\n🟡 [STEP] ${label}`);
  console.time(label);
  activeTimers.add(label);
}

function endStep(label: string) {
  if (!activeTimers.has(label)) {
    console.warn(`⚠️ Timer not found: ${label}`);
    return;
  }

  console.timeEnd(label);
  activeTimers.delete(label);
}

function logError(label: string, error: unknown) {
  console.error(`🔴 [ERROR] ${label}`, error);
}

function logInfo(label: string, data?: any) {
  console.log(`🔵 [INFO] ${label}`, data ?? "");
}

/* =========================
   🔥 SAFE TIMEOUT (NO CRASH)
========================= */

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const start = Date.now();

    const timer = setTimeout(() => {
      console.warn(`⏱️ [TIMEOUT] ${label} exceeded ${ms}ms`);
      resolve(null);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        console.log(`✅ [DONE] ${label} in ${Date.now() - start}ms`);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.error(`❌ [FAILED] ${label}`, error);
        reject(error);
      });
  });
}

/* =========================
   🚀 PAGE
========================= */

export default async function BabyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ babyId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  console.log("\n================ DASHBOARD REQUEST START ================");
  logStep("TOTAL_DASHBOARD");
  try {
    const [{ babyId }, resolvedSearchParams] = await Promise.all([
      params,
      searchParams,
    ]);

    /* =========================
       🔐 AUTH
    ========================= */

    logStep("AUTH");
    const session = await auth();
    endStep("AUTH");

    if (!session?.user?.id) {
      redirect("/login");
    }

    const todayStart = startOfDay(new Date());

    const rawDays = Number(resolvedSearchParams.days);
    const allowedDays = new Set([7, 14, 30, 60]);
    const rangeDays = allowedDays.has(rawDays) ? rawDays : 7;

    const chartEnd = new Date();
    const chartStart = subDays(chartEnd, rangeDays - 1);

    /* =========================
       👶 BABY CHECK (CRITICAL)
    ========================= */

    logStep("BABY_CHECK");

    let baby: { id: string; userId: string } | null = null;
    let userBabies: Baby[] = [
      {
        id: babyId,
        name: "Selected Baby",
        birthDate: null,
        gender: null,
        photoUrl: null,
      },
    ];
    let recentActivities: any[] = [];
    let upcomingReminders: any[] = [];
    let todayActivities: any[] = [];
    let insights: DashboardInsight[] = [];

    try {
      const babyResult = await withTimeout(
        db
          .select({
            id: babies.id,
            userId: babies.userId,
          })
          .from(babies)
          .where(eq(babies.id, babyId))
          .limit(1),
        2000,
        "baby-check"
      );

      logInfo("babyResult", babyResult);

      if (!babyResult || !Array.isArray(babyResult) || babyResult.length === 0) {
        redirect("/dashboard/babies");
      }

      baby = babyResult[0];

      if (!baby || baby.userId !== session.user.id) {
        redirect("/dashboard/babies");
      }
    } catch (error) {
      logError("BABY_CHECK_FAILED", error);
      redirect("/dashboard/babies");
    }

    endStep("BABY_CHECK");

    /* =========================
       📦 NON-CRITICAL QUERIES
    ========================= */

    const [
      userBabiesResult,
      recentActivitiesResult,
      upcomingRemindersResult,
      todayActivitiesResult,
    ] = await Promise.allSettled([
      withTimeout(getUserBabies(session.user.id), 3000, "user-babies"),
      withTimeout(getRecentActivities(babyId), 3000, "recent-activities"),
      withTimeout(getUpcomingReminders(babyId), 3000, "upcoming-reminders"),
      withTimeout(
        getTodayActivities(babyId, todayStart),
        3000,
        "today-activities"
      ),
    ]);

    logInfo("userBabiesResult", userBabiesResult);
    logInfo("recentActivitiesResult", recentActivitiesResult);
    logInfo("upcomingRemindersResult", upcomingRemindersResult);
    logInfo("todayActivitiesResult", todayActivitiesResult);

    if (
      userBabiesResult.status === "fulfilled" &&
      Array.isArray(userBabiesResult.value)
    ) {
      userBabies = userBabiesResult.value as Baby[];
    }

    recentActivities =
      recentActivitiesResult.status === "fulfilled" &&
        Array.isArray(recentActivitiesResult.value)
        ? recentActivitiesResult.value
        : [];

    upcomingReminders =
      upcomingRemindersResult.status === "fulfilled" &&
        Array.isArray(upcomingRemindersResult.value)
        ? upcomingRemindersResult.value
        : [];

    todayActivities =
      todayActivitiesResult.status === "fulfilled" &&
        Array.isArray(todayActivitiesResult.value)
        ? todayActivitiesResult.value
        : [];

    endStep("NON_CRITICAL_QUERIES");

    /* =========================
       📊 ANALYTICS
    ========================= */
    logStep("ANALYTICS");

    try {
      const analyticsResult = await withTimeout(
        withAnalyticsCache({
          babyId,
          scope: "dashboard",
          parts: [rangeDays, upcomingReminders.length],
          ttlSeconds: 120,
          loader: async () => {
            const results = await Promise.all([
              getFeedingSummary(babyId, rangeDays),
              getSleepSummary(babyId, rangeDays),
              getGrowthSummary(babyId, rangeDays),
              getDiaperSummary(babyId, rangeDays),
              getPlayAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
              getBathAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
              getMedicineAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
              getTemperatureAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
              getNapAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
              getPumpingAnalytics({ babyId, startDate: chartStart, endDate: chartEnd }),
            ]);

            return {
              insights: generateDashboardInsights({
                feeding: results[0],
                sleep: results[1],
                growth: results[2],
                diaper: results[3],
                play: results[4],
                bath: results[5],
                medicine: results[6],
                temperature: results[7],
                nap: results[8],
                pumping: results[9],
                remindersCount: upcomingReminders.length,
                days: rangeDays,
              }),
            };
          },
        }).then((d) => d.insights),
        4500,
        "analytics"
      );

      if (!analyticsResult) {
        logError("ANALYTICS_NULL", analyticsResult);
      }

      const rawInsights = Array.isArray(analyticsResult)
        ? analyticsResult
        : [];

      // 1️⃣ InsightResult → AssistantMessage
      const messages = convertInsightsToMessages(rawInsights);

      // 2️⃣ normalize (adds score, priority, etc.)
      const normalized = normalizeMessages(messages);

      // 3️⃣ AssistantMessage → DashboardInsight
      insights = toDashboardInsights(normalized);

    } catch (error) {
      logError("DASHBOARD_FALLBACK", error);
    } finally {
      endStep("ANALYTICS");
    }

    /* =========================
       🎨 RENDER
    ========================= */

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <DashboardHeader
            userName={session.user.name ?? "Parent"}
            babies={userBabies}
            selectedBabyId={babyId}
          />

          {/* Stats need full row: a flex row next to RangePresetSelector crushes the 3-col grid */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <RangePresetSelector />
            </div>
            <DashboardStats
              babiesCount={userBabies.length}
              todayCount={todayActivities.length}
              remindersCount={upcomingReminders.length}
            />
          </div>

          {/* ⚡ FLOATING ACTION BAR */}
          <div className="sticky top-20 z-40">
            <div className="
              flex gap-3 overflow-x-auto
              backdrop-blur-xl bg-white/70 dark:bg-white/10
              border border-white/20
              rounded-2xl px-4 py-3
              shadow-[0_10px_40px_rgba(0,0,0,0.1)]
            ">
              <DashboardQuickActions babyId={babyId} />
            </div>
          </div>

          {/* ⏱️ LIVE STATE GRID (MOST IMPORTANT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 🔴 FUTURE — REMINDERS */}
            <div className="
            backdrop-blur-xl bg-white/60 dark:bg-white/5
            border border-white/20
            rounded-2xl p-5
            shadow-[0_10px_40px_rgba(0,0,0,0.1)]
          ">
              <h2 className="text-sm font-semibold mb-3 text-neutral-500">
                Upcoming
              </h2>
              <DashboardReminders reminders={upcomingReminders} />
            </div>

            {/* 🔵 PRESENT / PAST — ACTIVITY */}
            <div className="
              backdrop-blur-xl bg-white/60 dark:bg-white/5
              border border-white/20
              rounded-2xl p-5
              shadow-[0_10px_40px_rgba(0,0,0,0.1)]
            ">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-neutral-500">
                  Recent Activity
                </h2>
                {recentActivities.length > 0 ? (
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {recentActivities.length} recent
                  </span>
                ) : null}
              </div>
              <DashboardActivity activities={recentActivities} embed />
            </div>

          </div>

          {/* 📊 SNAPSHOT STRIP (LIGHTWEIGHT) */}
          <div className="
          flex gap-6 text-sm text-neutral-600
          backdrop-blur-xl bg-white/50 dark:bg-white/5
          border border-white/10
          rounded-xl px-5 py-4
        ">
            <div>📊 {todayActivities.length} today</div>
            <div>⏰ {upcomingReminders.length} upcoming</div>
          </div>

          {/* 🧠 PATTERNS (NOT PRIMARY) */}
          <div className="
          backdrop-blur-xl bg-white/50 dark:bg-white/5
          border border-white/10
          rounded-2xl p-5
        ">
            <h2 className="text-sm font-semibold mb-3 text-neutral-500">
              Patterns & Trends
            </h2>

            <DashboardInsights insights={insights} />
          </div>
        </div>
      </div>
    );
  } finally {
    endStep("TOTAL_DASHBOARD");
    console.log("================ DASHBOARD REQUEST END ================\n");
  }
}
