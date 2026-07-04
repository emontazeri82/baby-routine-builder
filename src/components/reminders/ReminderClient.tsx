"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReminderCard from "./ReminderCard";

import ReminderInsights from "../insights/ReminderInsights";
import CollapsibleInsight from "./CollapsibleInsight";

import type { ReminderDTO as Reminder } from "@/lib/reminders";
type Insight = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  severity?: "info" | "warning" | "strong" | "success";
};

type Baby = {
  id: string;
  name: string;
  timezone?: string | null;
};

export default function ReminderClient({
  reminders,
  baby,
}: {
  reminders: Reminder[];
  baby: Baby;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<
    "active" | "paused" | "cancelled" | "overdue" | "upcoming"
  >("active");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "due-first" | "next-upcoming" | "latest-activity"
  >("due-first");
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIsHydrated(true);
      setNowMs(Date.now());
    }, 0);

    return () => window.clearTimeout(id);
  }, []);
  // Keep due-state/actionability current without manual reload.
  // Time-based reminder states can change while the user stays on this page.
  useEffect(() => {
    let running = false;

    const refresh = async () => {
      if (running) return;
      running = true;

      try {
        await fetch("/api/reminders/due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ babyId: baby.id }),
        });
      } finally {
        router.refresh();
        running = false;
      }
    };

    const intervalId = window.setInterval(refresh, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const onFocus = () => refresh();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [baby.id, router]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const visible = reminders.filter((r) => {
      // 🔍 SEARCH
      if (query) {
        const haystack = `${r.title ?? ""} ${r.description ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // 📊 STATUS FILTER
      if (statusFilter === "active") return r.status === "active";
      if (statusFilter === "paused") return r.status === "paused";
      if (statusFilter === "cancelled") return r.status === "cancelled";

      if (statusFilter === "overdue") {
        return r.status === "active" && r.currentState === "overdue";
      }

      if (statusFilter === "upcoming") {
        return (
          r.status === "active" &&
          r.currentState === "upcoming" &&
          (r.nextUpcomingAt || r.nextScheduleAt)
        );
      }

      return true;
    });

    return [...visible].sort((a, b) => {
      if (sortBy === "due-first") {
        if (a.overdueCount !== b.overdueCount) {
          return b.overdueCount - a.overdueCount;
        }

        const aNext = a.nextUpcomingAt ?? a.nextScheduleAt;
        const bNext = b.nextUpcomingAt ?? b.nextScheduleAt;

        const aUpcoming = aNext
          ? new Date(aNext).getTime()
          : Number.POSITIVE_INFINITY;

        const bUpcoming = bNext
          ? new Date(bNext).getTime()
          : Number.POSITIVE_INFINITY;
        if (aUpcoming !== bUpcoming) {
          return aUpcoming - bUpcoming;
        }
      }

      if (sortBy === "next-upcoming") {
        const aUpcoming = a.nextUpcomingAt
          ? new Date(a.nextUpcomingAt).getTime()
          : Number.POSITIVE_INFINITY;
        const bUpcoming = b.nextUpcomingAt
          ? new Date(b.nextUpcomingAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (aUpcoming !== bUpcoming) {
          return aUpcoming - bUpcoming;
        }
        if (a.overdueCount !== b.overdueCount) {
          return b.overdueCount - a.overdueCount;
        }
      }

      if (sortBy === "latest-activity") {
        const aLast = a.lastScheduledFor
          ? new Date(a.lastScheduledFor).getTime()
          : 0;
        const bLast = b.lastScheduledFor
          ? new Date(b.lastScheduledFor).getTime()
          : 0;
        if (aLast !== bLast) {
          return bLast - aLast;
        }
      }

      return a.id.localeCompare(b.id);
    });
  }, [reminders, search, sortBy, statusFilter]);

  const { activeCount, overdueTotal, completionTotal } = useMemo(() => {
    return {
      activeCount: reminders.filter((r) => r.status === "active").length,

      overdueTotal: reminders.reduce(
        (acc, r) =>
          acc +
          (r.status === "active" && r.currentState === "overdue"
            ? Number(r.overdueCount ?? 0)
            : 0),
        0
      ),
      completionTotal: reminders.reduce(
        (acc, r) => acc + Number(r.completedOccurrences ?? 0),
        0
      ),
    };
  }, [reminders]);
  const nextUpcoming = useMemo(() => {
    if (!isHydrated) return null;

    return reminders
      .map((r) => r.nextUpcomingAt ?? r.nextScheduleAt)
      .filter(Boolean)
      .map((d) => new Date(d as string | Date))
      .sort((a, b) => a.getTime() - b.getTime())[0];
  }, [reminders, isHydrated]);
  const insight = useMemo<Insight | null>(() => {
    if (!isHydrated) return null; // 🔥 ADD THIS

    if (overdueTotal > 3) {
      return {
        title: "You're falling behind on reminders",
        description: "Try adjusting frequency or timing to reduce overload",
        severity: "strong", // 🔥 stronger visual (better UX)
      };
    }

    if (nextUpcoming && nowMs !== null) {
      const diff = nextUpcoming.getTime() - nowMs;

      if (diff > 0 && diff < 30 * 60 * 1000) {
        return {
          title: "Upcoming reminder soon",
          description: "You have a reminder in the next 30 minutes",
          severity: "warning", // ⚠️ add this (you forgot)
        };
      }
    }

    if (completionTotal > 10) {
      return {
        title: "Great consistency",
        description: "You're keeping up well with reminders 👏",
        severity: "success", // ✅ MUCH better than info
      };
    }

    return {
      title: "Everything looks good",
      description: "No urgent reminders right now ✨",
      severity: "success", // ✅ NOT info → no more blue confusion
    };
  }, [overdueTotal, nextUpcoming, completionTotal, isHydrated, nowMs]);
  useEffect(() => {
    console.log("🧠 INSIGHT DEBUG", {
      overdueTotal,
      completionTotal,
      completionType: typeof completionTotal,
      nextUpcoming,
      insight,
    });
  }, [overdueTotal, completionTotal, nextUpcoming, insight]);
  return (
    <div className="space-y-8 p-8">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Reminders
        </h1>
        <p className="text-neutral-500">
          Stay ahead of <span className="font-medium text-neutral-700">{baby.name}</span>&apos;s routine
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Overdue" value={overdueTotal} highlight="danger" />
        <StatCard title="Active" value={activeCount} />
        <StatCard title="Completed" value={completionTotal} highlight="success" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CollapsibleInsight>
          <ReminderInsights reminders={reminders} />
        </CollapsibleInsight>
      </motion.div>
      <Card className="space-y-4 border border-border/60 bg-background/70 backdrop-blur p-5 shadow-sm rounded-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            {nextUpcoming
              ? isHydrated
                ? `Next global reminder ${formatDistanceToNow(nextUpcoming, {
                  addSuffix: true,
                })}`
                : `Next global reminder at ${format(nextUpcoming, "PPp")}`
              : "No upcoming reminders"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description"
              className="h-9 min-w-[220px] rounded-md border bg-background px-3 text-sm"
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "due-first" | "next-upcoming" | "latest-activity"
                )
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="due-first">Sort: Due First</option>
              <option value="next-upcoming">Sort: Next Upcoming</option>
              <option value="latest-activity">Sort: Latest Activity</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div className="flex flex-wrap gap-2">
          {([
            ["active", "Active", "bg-blue-500"],
            ["paused", "Paused", "bg-yellow-500"],
            ["cancelled", "Archived", "bg-gray-500"],
            ["overdue", "Overdue", "bg-red-500"],
            ["upcoming", "Upcoming", "bg-green-500"],
          ] as const).map(([key, label, color]) => {
            const isActive = statusFilter === key;

            return (
              <Button
                key={key}
                onClick={() => setStatusFilter(key)}
                variant="outline"
                className={cn(
                  "relative px-4 py-1.5 rounded-full text-sm font-medium",
                  "transition-all duration-200 ease-out",
                  "backdrop-blur border",

                  // DEFAULT
                  !isActive &&
                  "bg-white/70 text-neutral-600 border-neutral-200",

                  // 👇 ONLY allow hover if NOT active
                  !isActive &&
                  "hover:scale-105 hover:-translate-y-[1px] hover:shadow-md",

                  // ACTIVE
                  isActive &&
                  cn(
                    "text-white border-transparent shadow-md scale-105",
                    color
                  )
                )}
              >
                {label}

                {/* glow */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-50" />
                )}
              </Button>
            );
          })}
        </div>

        <Link href={`/dashboard/${baby.id}/reminders/new`}>
          <Button>Add Reminder</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {overdueTotal > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            🔥 You have {overdueTotal} overdue reminder{overdueTotal > 1 ? "s" : ""}
          </div>
        )}
        {filtered.length === 0 && <EmptyState query={search} />}

        {filtered.map((reminder) => (
          <motion.div key={reminder.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ReminderCard
              reminder={reminder}
              timezone={baby.timezone ?? "UTC"}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number | string;
  highlight?: "danger" | "success";
}) {
  return (
    <Card
      className={cn(
        "p-5 rounded-2xl border backdrop-blur transition-all hover:shadow-md",
        "bg-white/70 dark:bg-neutral-900/60",
        highlight === "danger" && "border-red-200 bg-red-50/70",
        highlight === "success" && "border-green-200 bg-green-50/70"
      )}
    >
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </Card>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-16 text-center text-neutral-500">
      {query ? "No reminders match your search." : "No reminders found."}
    </div>
  );
}
