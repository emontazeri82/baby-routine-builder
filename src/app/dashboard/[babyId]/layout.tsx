import Link from "next/link";
import PageTransition from "@/components/dashboard/PageTransition";
import NotificationBell from "@/components/dashboard/notifications/NotificationBell";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { listReminders } from "@/lib/reminders";
import { redirect } from "next/navigation";
import { autoEndStaleActivities } from "@/lib/activities/autoEndStaleActivities";
import AssistantOverlay from "@/components/assistant/AssistantOverlay";
import MobileHamburger from "@/components/dashboard/MobileHamburger";
import OpenAssistantButton from "@/components/dashboard/OpenAssistantButton";


export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ babyId: string }>;
}) {
  const { babyId } = await params;

  const session = await auth();
  if (!session?.user?.id) return null;

  const baby = await db
    .select({
      id: babies.id,
    })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!baby.length) {
    redirect("/dashboard/babies");
  }

  await autoEndStaleActivities({
    babyId,
    userId: session.user.id,
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [activityData, reminders] = await Promise.all([
    db
      .select({
        id: activities.id,
        startTime: activities.startTime,
        endTime: activities.endTime,
        activityName: activityTypes.name,
        metadata: activities.metadata,
      })
      .from(activities)
      .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(activities.babyId, babyId),
          gte(activities.startTime, sevenDaysAgo) // ✅ ONLY ADD THIS
        )
      )
      .orderBy(desc(activities.startTime))
      .limit(300), // ✅ increase cap (safe)
    listReminders({
      babyId,
      userId: session.user.id,
      status: "all",
    }),
  ]);

  return (
    <div className="relative min-h-screen flex">
      {/* 🌈 Animated Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,#a5b4fc,transparent_40%),radial-gradient(circle_at_80%_30%,#f9a8d4,transparent_40%),radial-gradient(circle_at_50%_80%,#67e8f9,transparent_40%)]" />

      {/* Soft blur overlay */}
      <div className="absolute inset-0 -z-10 backdrop-blur-3xl bg-white/40" />

      {/* Desktop sidebar: lg+ (min 1024px). Below lg, nav is MobileHamburger in header. */}
      <aside className="
        w-64 shrink-0
        bg-white/40 backdrop-blur-2xl
        border-r border-white/30
        hidden lg:flex flex-col p-6
        shadow-[0_10px_40px_rgba(0,0,0,0.08)]
      ">
        <h2 className="text-xl font-semibold mb-10 tracking-tight bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
          Baby Routine
        </h2>

        <nav className="space-y-3 text-sm">
          <NavItem href={`/dashboard/${babyId}`}>Dashboard</NavItem>
          <NavItem href="/dashboard/babies">Babies</NavItem>
          <NavItem href={`/dashboard/${babyId}/activities`}>Activity</NavItem>
          <NavItem href={`/dashboard/${babyId}/reminders`}>Reminders</NavItem>
          <NavItem href={`/dashboard/${babyId}/calendar`}>Calendar</NavItem>
          <NavItem href={`/dashboard/${babyId}/analytics`}>Analytics</NavItem>
          <NavItem href="/dashboard/settings">Settings</NavItem>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">

        {/* Header */}
        <header className="
          h-16 shrink-0
          bg-white/40 backdrop-blur-2xl
          border-b border-white/30
          px-8 flex items-center justify-between
          shadow-[0_8px_30px_rgba(0,0,0,0.05)]
        ">
          <div className="flex items-center gap-3">
            <MobileHamburger babyId={babyId} />
            <span className="text-sm font-medium bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Welcome back 👋
            </span>
          </div>
          <div className="flex items-center gap-4">

            <OpenAssistantButton />

            {/* 🔔 Notification Bell Wrapper */}
            <div className="relative group">
              <NotificationBell babyId={babyId} />

              {/* Ambient Glow */}
              <div className="
                pointer-events-none
                absolute inset-0 rounded-full
                bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-500
                blur-xl opacity-0 group-hover:opacity-30
                transition duration-300
              " />
            </div>

            {/* Logout */}
            <form action="/api/auth/signout" method="post">
              <button className="text-sm text-red-500 hover:text-red-600 transition">
                Logout
              </button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="
          flex-1 min-h-0 min-w-0 w-full overflow-auto
          p-4 sm:p-6 lg:p-8
        ">
          <div className="
            rounded-3xl
            bg-white/50 backdrop-blur-xl
            border border-white/30
            shadow-[0_10px_40px_rgba(0,0,0,0.05)]
            p-6
          ">
            <PageTransition>
              {children}
            </PageTransition>

          </div>
        </main>
      </div>

      <AssistantOverlay
        babyId={babyId}
        activities={activityData}
        reminders={reminders}
      />
    </div>
  );
}

/* NAV ITEM */

function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        group relative block px-4 py-2 rounded-xl
        text-neutral-600
        transition-all duration-300
        hover:text-white
      "
    >
      <span className="
        absolute inset-0 rounded-xl
        bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-500
        opacity-0 group-hover:opacity-100
        transition duration-300
      " />

      <span className="
        absolute inset-0 rounded-xl blur-xl
        bg-gradient-to-r from-indigo-500 to-pink-500
        opacity-0 group-hover:opacity-40
        transition
      " />

      <span className="relative z-10">
        {children}
      </span>
    </Link>
  );
}