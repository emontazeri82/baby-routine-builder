import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies, activities, reminders } from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { startOfDay, subDays } from "date-fns";

import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardActivity from "@/components/dashboard/DashboardActivity";
import DashboardReminders from "@/components/dashboard/DashboardReminders";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardChart from "@/components/dashboard/DashboardChart";

export default async function BabyDashboardPage({
  params,
}: {
  params: Promise<{ babyId: string }>;
}) {
  const { babyId } = await params;
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

  const weekStart = subDays(new Date(), 6);

  const weeklyActivities = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        gte(activities.startTime, weekStart)
      )
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <DashboardHeader
          userName={session.user.name ?? "Parent"}
          babies={userBabies}
          selectedBabyId={babyId}
        />

        <DashboardQuickActions babyId={babyId} />

        <DashboardStats
          babiesCount={1}
          todayCount={todayActivities.length}
          remindersCount={upcomingReminders.length}
        />

        <DashboardInsights
          babiesCount={1}
          todayCount={todayActivities.length}
          remindersCount={upcomingReminders.length}
        />

        <DashboardChart activities={weeklyActivities} />

        <DashboardActivity activities={recentActivities} />

        <DashboardReminders reminders={upcomingReminders} />
      </div>
    </div>
  );
}
