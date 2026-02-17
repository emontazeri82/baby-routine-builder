
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies, activities, reminders } from "@/lib/db/schema";
import { eq, desc, inArray, gte, and } from "drizzle-orm";
import { startOfDay, subDays } from "date-fns";

import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardActivity from "@/components/dashboard/DashboardActivity";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardChart from "@/components/dashboard/DashboardChart";


export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  /* --------------------------
     FETCH BABIES
  --------------------------- */

  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, userId));

  const babyIds = userBabies.map((b) => b.id);

  /* --------------------------
     FETCH ACTIVITIES
  --------------------------- */

  const recentActivities =
    babyIds.length > 0
      ? await db
        .select()
        .from(activities)
        .where(inArray(activities.babyId, babyIds))
        .orderBy(desc(activities.startTime))
        .limit(5)
      : [];

  /* --------------------------
     FETCH REMINDERS
  --------------------------- */

  const upcomingReminders =
    babyIds.length > 0
      ? await db
        .select()
        .from(reminders)
        .where(inArray(reminders.babyId, babyIds))
        .limit(5)
      : [];

  /* --------------------------
     TODAY ACTIVITIES COUNT
  --------------------------- */

  const todayStart = startOfDay(new Date());

  const todayActivities =
    babyIds.length > 0
      ? await db
        .select()
        .from(activities)
        .where(
          and(
            inArray(activities.babyId, babyIds),
            gte(activities.startTime, todayStart)
          )
        ) : [];

  /* --------------------------
     WEEKLY DATA PREP (7 days)
  --------------------------- */

  const weekStart = subDays(new Date(), 6);

  const weeklyActivities =
    babyIds.length > 0
      ? await db
        .select()
        .from(activities)
        .where(
          and(
            inArray(activities.babyId, babyIds),
            gte(activities.startTime, weekStart)
          )
        )
      : [];
  console.log("USER ID:", userId);
  console.log("BABIES:", userBabies);
  console.log("RECENT ACTIVITIES:", recentActivities);
  console.log("UPCOMING REMINDERS:", upcomingReminders);
  console.log("TODAY ACTIVITIES:", todayActivities.length);
  console.log("WEEKLY ACTIVITIES:", weeklyActivities.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* HEADER */}
        <DashboardHeader
          userName={session.user.name ?? "Parent"}
          babies={userBabies}
          selectedBabyId={babyIds[0]}
        />

        <DashboardQuickActions />

        {/* EXECUTIVE STATS */}
        <DashboardStats
          babiesCount={userBabies.length}
          todayCount={todayActivities.length}
          remindersCount={upcomingReminders.length}
        />

        {/* SMART INSIGHTS */}
        <DashboardInsights
          babiesCount={userBabies.length}
          todayCount={todayActivities.length}
          remindersCount={upcomingReminders.length}
        />

        {/* WEEKLY TREND CHART */}
        <DashboardChart activities={weeklyActivities} />

        {/* RECENT ACTIVITY */}
        <DashboardActivity activities={recentActivities} />

        {/* REMINDERS */}
        <DashboardReminders reminders={upcomingReminders} />

      </div>
    </div>
  );
}
