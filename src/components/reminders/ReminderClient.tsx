"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow, isAfter } from "date-fns";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReminderCard from "./ReminderCard";

type Reminder = {
  id: string;
  babyId: string;
  activityTypeId: string | null;
  title: string | null;
  description: string | null;
  scheduleType: "one-time" | "recurring" | "interval";
  status: "active" | "paused" | "cancelled";
  remindAt: Date | string;
  cronExpression: string | null;
  repeatIntervalMinutes: number | null;
  currentState:
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "completed"
  | "skipped"
  | "last_completed"
  | "last_skipped"
  | "upcoming";
  nextUpcomingAt: Date | string | null;
  nextScheduleAt: Date | string | null;
  overdueCount: number;
  hasDueOccurrence: boolean;
  pendingOccurrences: number;
  completedOccurrences: number;
  skippedOccurrences: number;
  expiredOccurrences: number;
  lastResolvedStatus: "completed" | "skipped" | null;
  lastResolvedAt: Date | string | null;
  lastCompletedAt: Date | string | null;
  lastScheduledFor: Date | string | null;
  snoozedUntil: Date | string | null;
  tags: unknown;
};

type Baby = {
  id: string;
  name: string;
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

  // Keep due-state/actionability current without manual reload.
  // Time-based reminder states can change while the user stays on this page.
  useEffect(() => {
    const refresh = () => router.refresh();
    const intervalId = window.setInterval(refresh, 30_000);

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
  }, [router]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = reminders.filter((r) => {
      if (statusFilter !== "cancelled" && r.status === "cancelled") {
        return false;
      }
      if (statusFilter === "active" && r.status !== "active") return false;
      if (statusFilter === "paused" && r.status !== "paused") return false;
      if (statusFilter === "cancelled" && r.status !== "cancelled") return false;
      if (statusFilter === "overdue") {
        if (!r.hasDueOccurrence && r.overdueCount <= 0 && r.currentState !== "overdue") {
          return false;
        }
      }

      if (statusFilter === "upcoming") {
        const next = r.nextUpcomingAt ?? r.nextScheduleAt;

        if (!next) return false;

        if (!isAfter(new Date(next), new Date())) return false;
      }

      if (query) {
        const haystack = `${r.title ?? ""} ${r.description ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
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

  const activeCount = reminders.filter((r) => r.status === "active").length;
  const overdueTotal = reminders.reduce((acc, r) => acc + (r.overdueCount ?? 0), 0);
  const completionTotal = reminders.reduce(
    (acc, r) => acc + (r.completedOccurrences ?? 0),
    0
  );
  const nextUpcoming = reminders
    .map((r) => r.nextUpcomingAt ?? r.nextScheduleAt)
    .filter(Boolean)
    .map((d) => new Date(d as string | Date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <div className="space-y-8 p-8">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Reminders</h1>
        <p className="text-neutral-500">Stay ahead of {baby.name}'s routine</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Total" value={reminders.length} />
        <StatCard title="Active" value={activeCount} />
        <StatCard title="Overdue" value={overdueTotal} />
        <StatCard title="Completed" value={completionTotal} />
        <StatCard title="For" value={baby.name} />
      </div>

      <Card className="space-y-3 border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            {nextUpcoming
              ? `Next global reminder ${formatDistanceToNow(nextUpcoming, {
                addSuffix: true,
              })}`
              : "No upcoming reminder scheduled."}
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
            ["active", "Active"],
            ["paused", "Paused"],
            ["cancelled", "Archived"],
            ["overdue", "Overdue"],
            ["upcoming", "Upcoming"],
          ] as const).map(([key, label]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Link href={`/dashboard/${baby.id}/reminders/new`}>
          <Button>Add Reminder</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && <EmptyState query={search} />}

        {filtered.map((reminder) => (
          <motion.div key={reminder.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ReminderCard reminder={reminder} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="border border-border/60 bg-background p-6">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
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
