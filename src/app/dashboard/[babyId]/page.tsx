import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies, activities, reminders } from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { startOfDay, subDays } from "date-fns";

import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardActivity from "@/components/dashboard/DashboardActivity";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import { generateDashboardInsights } from "@/lib/insights";
import type { DashboardInsight } from "@/lib/insights/types";
import { withAnalyticsCache } from "@/lib/cache/analyticsCache";

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
  console.log(`\n🟡 [STEP] ${label}`);
  if (!activeTimers.has(label)) {
    console.time(label);
    activeTimers.add(label);
  }
}

function endStep(label: string) {
  if (activeTimers.has(label)) {
    console.timeEnd(label);
    activeTimers.delete(label);
  }
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
     DEFAULT FALLBACKS
  ========================= */

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

  /* =========================
     📦 NON-CRITICAL QUERIES
  ========================= */

  try {
    logStep("NON_CRITICAL_QUERIES");

    const [
      userBabiesResult,
      recentActivitiesResult,
      upcomingRemindersResult,
      todayActivitiesResult,
    ] = await Promise.allSettled([
      withTimeout(
        db
          .select({ id: babies.id, name: babies.name })
          .from(babies)
          .where(eq(babies.userId, session.user.id))
          .limit(50),
        3000,
        "user-babies"
      ),
      withTimeout(
        db
          .select({ id: activities.id, startTime: activities.startTime })
          .from(activities)
          .where(eq(activities.babyId, babyId))
          .orderBy(desc(activities.startTime))
          .limit(5),
        3000,
        "recent-activities"
      ),
      withTimeout(
        db
          .select({ id: reminders.id, title: reminders.title })
          .from(reminders)
          .where(eq(reminders.babyId, babyId))
          .limit(5),
        3000,
        "upcoming-reminders"
      ),
      withTimeout(
        db
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              eq(activities.babyId, babyId),
              gte(activities.startTime, todayStart)
            )
          ),
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

    insights = Array.isArray(analyticsResult) ? analyticsResult : [];

    logInfo("INSIGHTS COUNT", insights.length);

    endStep("ANALYTICS");
  } catch (error) {
    logError("DASHBOARD_FALLBACK", error);
  }

  endStep("TOTAL_DASHBOARD");
  console.log("================ DASHBOARD REQUEST END ================\n");

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

        <RangePresetSelector />
        <DashboardQuickActions babyId={babyId} />

        <DashboardStats
          babiesCount={1}
          todayCount={todayActivities.length}
          remindersCount={upcomingReminders.length}
        />

        <DashboardInsights insights={insights} />
        <DashboardActivity activities={recentActivities} />
        <DashboardReminders reminders={upcomingReminders} />
      </div>
    </div>
  );
}
