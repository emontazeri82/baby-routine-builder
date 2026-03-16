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


export default async function BabyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ babyId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const [{ babyId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const session = await auth();


  if (!session?.user?.id) {
    redirect("/login");
  }
  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, session.user.id));

  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  if (!baby.length || baby[0].userId !== session.user.id) {
    redirect("/dashboard/babies");
  }

  const recentActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.babyId, babyId))
    .orderBy(desc(activities.startTime))
    .limit(5);

  const upcomingReminders = await db
    .select()
    .from(reminders)
    .where(eq(reminders.babyId, babyId))
    .limit(5);

  const todayStart = startOfDay(new Date());

  const todayActivities = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        gte(activities.startTime, todayStart)
      )
    );

  const rawDays = Number(resolvedSearchParams.days);
  const allowedDays = new Set([7, 14, 30, 60]);
  const rangeDays = allowedDays.has(rawDays) ? rawDays : 7;
  const chartStart = subDays(new Date(), rangeDays - 1);

  const [
    feedingSummary,
    sleepSummary,
    growthSummary,
    diaperAnalyticsData, // ✅ ADD
    playAnalyticsData,
    bathAnalyticsData,
    medicineAnalyticsData,
    temperatureAnalyticsData,
    napAnalyticsData,
    pumpingAnalyticsData,
  ] = await Promise.all([
    getFeedingSummary(babyId, rangeDays),
    getSleepSummary(babyId, rangeDays),
    getGrowthSummary(babyId, rangeDays),
    getDiaperSummary(babyId, rangeDays), // ✅ ADD
    getPlayAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
    getBathAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
    getMedicineAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
    getTemperatureAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
    getNapAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
    getPumpingAnalytics({
      babyId,
      startDate: chartStart,
      endDate: new Date(),
    }),
  ]);
  const remindersCount = upcomingReminders.length;

  const insights = generateDashboardInsights({
    feeding: feedingSummary,
    sleep: sleepSummary,
    growth: growthSummary,
    diaper: diaperAnalyticsData,
    play: playAnalyticsData,
    bath: bathAnalyticsData,
    medicine: medicineAnalyticsData,
    temperature: temperatureAnalyticsData,
    nap: napAnalyticsData,
    pumping: pumpingAnalyticsData,
    remindersCount,
    days: rangeDays,
  });

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

        {/*<DashboardChart
          activities={weeklyActivities}
          rangeDays={rangeDays}
        />*/}

        <DashboardActivity activities={recentActivities} />

        <DashboardReminders reminders={upcomingReminders} />
      </div>
    </div>
  );
}
