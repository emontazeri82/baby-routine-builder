"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Stat } from "@/components/ui/Stat";
type TimelineCategory =
  | "activity"
  | "reminder_completed"
  | "reminder_skipped"
  | "reminder_snoozed"
  | "reminder_expired"
  | "reminder_triggered";

type TimelineEvent = {
  id: string;
  category: TimelineCategory;
  status: string;
  at: string;
  title: string;
  subtitle: string | null;
  source: "manual" | "reminder" | "system";
  severity?: string | null;
  deliveryStatus?: string | null;
  attempts?: number | null;
  reminderId?: string;
  occurrenceId?: string | null;
  scheduledFor?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  delayMinutes?: number | null;
  occurrenceStatus?: "pending" | "completed" | "skipped" | "expired";
  eventType?: string | null;
  metadata?: unknown;
  reminderOutcome?: "completed" | null;
  endTime?: string | null;
};

type DailySummaryResponse = {
  date: string;
  stats: {
    activitiesLogged: number;
    remindersCompleted: number;
    remindersSkipped: number;
    remindersSnoozed: number;
    remindersExpired: number;
    overdueReminders: number;
    activeReminders: number;
    averageResponseTimeMinutes: number | null;
    completionRate: number | null;
    mostActiveActivityType: string | null;
  };
  timeline: TimelineEvent[];
};

type MetadataField = {
  label: string;
  value: string;
};

function toTitleCase(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getEnhancedMetadataFields(metadata: unknown): MetadataField[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const hiddenKeys = new Set([
    "amountMl",
    "milliliters",
    "totalMl",
    "volumeMl",
    "intakeMl",
    "durationMinutes",
    "notes",
    "unit", // 👈 hide standalone unit
  ]);

  const result: MetadataField[] = [];
  const record = metadata as Record<string, unknown>;

  function isMeaningful(value: unknown) {
    if (value === null || value === undefined) return false;

    if (typeof value === "string") {
      return value.trim() !== "";
    }

    if (typeof value === "number") {
      return !isNaN(value) && value !== 0; // 👈 hides useless 0
    }

    if (typeof value === "boolean") {
      return value === true; // 👈 only show true
    }

    return false;
  }

  for (const [key, rawValue] of Object.entries(record)) {
    if (hiddenKeys.has(key)) continue;
    if (!isMeaningful(rawValue)) continue;

    // 🔥 SPECIAL RULE: hide "unit" unless paired with value
    if (key === "unit") {
      if (!record["value"] && !record["amount"] && !record["quantity"]) {
        continue;
      }
    }

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      result.push({
        label: toTitleCase(key),
        value: String(rawValue),
      });
      continue;
    }

    if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
      const nested = rawValue as Record<string, unknown>;

      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        if (!isMeaningful(nestedValue)) continue;

        result.push({
          label: `${toTitleCase(key)} ${toTitleCase(nestedKey)}`,
          value: String(nestedValue),
        });
      }
    }
  }

  return result.slice(0, 8);
}

export default function BabyDayPage() {
  const params = useParams();
  const babyId = params.babyId as string;
  const date = params.date as string; // format: YYYY-MM-DD
  const [filter, setFilter] = useState<"all" | "activity" | "reminder" | "trigger">("all");

  function parseDateKeyLocal(dateKey: string) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const dayStartLocal = parseDateKeyLocal(date);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-summary", babyId, date],
    queryFn: async () => {
      const res = await fetch(
        `/api/daily-summary?babyId=${babyId}&date=${encodeURIComponent(date)}`
      );
      if (!res.ok) throw new Error("Failed to load day");
      return (await res.json()) as DailySummaryResponse;
    },
  });

  const stats = data?.stats;
  const overdue = stats?.overdueReminders ?? 0;
  const filteredTimeline = useMemo(() => {
    const timeline = data?.timeline ?? [];
    if (filter === "all") return timeline;
    if (filter === "activity") {
      return timeline.filter(
        (event) =>
          event.category === "activity" &&
          !(
            event.source === "reminder" &&
            event.reminderOutcome === "completed"
          )
      );
    }
    if (filter === "trigger") {
      return timeline.filter((event) => event.category === "reminder_triggered");
    }
    return timeline.filter(
      (event) =>
        event.category.startsWith("reminder_") ||
        (event.category === "activity" &&
          event.source === "reminder" &&
          event.reminderOutcome === "completed")
    );
  }, [filter, data?.timeline]);
  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();

    filteredTimeline.forEach((event) => {
      const dateObj = new Date(event.at);
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}-${dateObj.getHours()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(event);
    });

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: new Date(items[0].at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        items,
      }))
      .sort(
        (a, b) =>
          new Date(b.items[0].at).getTime() - new Date(a.items[0].at).getTime()
      );
  }, [filteredTimeline]);

  function statusBadgeVariant(status: string) {
    if (status === "completed" || status === "sent") return "success" as const;
    if (status === "expired") return "destructive" as const;
    if (status === "skipped" || status === "failed" || status === "permanently_failed") {
      return "destructive" as const;
    }
    if (status === "snoozed" || status === "retrying") return "secondary" as const;
    return "outline" as const;
  }

  function statusBadgeLabel(event: TimelineEvent) {
    if (
      event.category === "activity" &&
      event.source === "reminder" &&
      event.reminderOutcome === "completed"
    ) {
      return "reminder completed";
    }
    return event.status;
  }

  function categoryIcon(event: TimelineEvent) {
    switch (event.eventType) {
      case "feeding":
        return "🍼";
      case "sleep":
      case "nap":
        return "💤";
      case "diaper":
        return "🧷";
      case "bath":
        return "🛁";
      case "medicine":
        return "💊";
      case "temperature":
        return "🌡️";
      case "pumping":
        return "🧴";
      case "growth":
        return "📏";
      default:
        return event.category === "reminder_triggered" ? "🟡" : "🟢";
    }
  }

  return (
  <div className="space-y-10 p-4 pb-32 sm:p-6 lg:p-8 bg-gradient-to-b from-neutral-50 to-neutral-100 min-h-screen">

    {/* 🔹 HEADER */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          {dayStartLocal.toDateString()}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          A complete overview of your baby's day
        </p>
      </div>

      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto hover:shadow-md transition"
      >
        <Link href={`/dashboard/${babyId}/calendar`}>
          ← Back to Month
        </Link>
      </Button>
    </div>

    {/* 🔹 STATS */}
    <Card className="p-6 shadow-sm hover:shadow-md transition">
      <h2 className="text-lg font-semibold mb-5 text-neutral-800">
        Today’s Snapshot
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Stat
          label="Activities"
          value={stats?.activitiesLogged ?? 0}
          icon="📊"
        />

        <div className="lg:col-span-2">
          <Stat
            label="Completion"
            value={
              stats?.completionRate == null
                ? "—"
                : `${Math.round(stats.completionRate * 100)}%`
            }
            trend={
              stats?.completionRate == null
                ? undefined
                : stats.completionRate >= 0.8
                ? "up"
                : stats.completionRate < 0.5
                ? "down"
                : "neutral"
            }
            icon="🎯"
          />
        </div>

        <Stat
          label="Overdue"
          value={overdue}
          icon="⚠️"
          description={overdue > 0 ? "Needs attention" : "All good"}
          trend={overdue > 0 ? "down" : "up"}
          variant={overdue > 0 ? "danger" : "success"}
        />
      </div>

      {/* 🔥 ALERT */}
      {overdue > 0 && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          ⚠️ You have overdue reminders — take action
        </div>
      )}
    </Card>

    {/* 🔹 TIMELINE */}
    <Card className="p-5 sm:p-6 shadow-sm hover:shadow-md transition">

      {/* FILTERS */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["all", "📊 All"],
          ["activity", "🍼 Activities"],
          ["reminder", "⏰ Reminders"],
          ["trigger", "⚡ Triggers"],
        ].map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key as any)}
            className={`transition ${
              filter === key
                ? "shadow-md scale-105"
                : "hover:shadow-sm hover:-translate-y-[1px]"
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-500 animate-pulse">
          Loading timeline...
        </p>
      )}

      {!isLoading && filteredTimeline.length === 0 && (
        <p className="text-neutral-500 text-sm">
          No entries for this day.
        </p>
      )}

      <div className="space-y-8">
        {groupedTimeline.map((group) => (
          <div key={group.key} className="space-y-4">

            {/* TIME LABEL */}
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {group.label}
            </div>

            {/* EVENTS */}
            <div className="space-y-3">
              {group.items.map((event) => {

                const borderColor =
                  event.status === "completed"
                    ? "border-l-green-500"
                    : event.status === "overdue"
                    ? "border-l-red-500"
                    : event.status === "snoozed"
                    ? "border-l-yellow-500"
                    : "border-l-neutral-200";

                return (
                  <div
                    key={event.id}
                    className={`flex flex-col sm:flex-row gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:shadow-md hover:-translate-y-[2px] border-l-4 ${borderColor}`}
                  >
                    {/* TIME */}
                    <div className="shrink-0 text-sm font-medium text-neutral-500 sm:w-20">
                      {new Date(event.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0">

                      <div className="flex flex-wrap items-center gap-2">
                        <span>{categoryIcon(event)}</span>

                        <div className="font-semibold text-neutral-900 break-words">
                          {event.title}
                        </div>

                        <Badge variant={statusBadgeVariant(event.status)}>
                          {statusBadgeLabel(event)}
                        </Badge>
                      </div>

                      {event.subtitle && (
                        <div className="mt-1 text-sm text-neutral-500">
                          {event.subtitle}
                        </div>
                      )}

                      {event.scheduledFor && (
                        <div className="mt-1 text-xs text-neutral-400">
                          ⏰ Scheduled:{" "}
                          {new Date(event.scheduledFor).toLocaleTimeString()}
                        </div>
                      )}

                      {(event.endTime || event.completedAt) && (
                        <div className="mt-1 text-xs text-neutral-400">
                          ✅ Completed:{" "}
                          {new Date(
                            event.endTime || event.completedAt!
                          ).toLocaleTimeString()}
                        </div>
                      )}

                      {event.skippedAt && (
                        <div className="mt-1 text-xs text-neutral-400">
                          ⏭ Skipped:{" "}
                          {new Date(event.skippedAt).toLocaleTimeString()}
                        </div>
                      )}

                      {typeof event.delayMinutes === "number" && (
                        <div className="mt-1 text-xs text-neutral-400">
                          🕒 {event.delayMinutes > 0 ? "+" : ""}
                          {event.delayMinutes} min
                        </div>
                      )}

                      {event.category === "activity" && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getEnhancedMetadataFields(event.metadata).map(
                            (field) => (
                              <Badge
                                key={`${event.id}-${field.label}`}
                                variant="secondary"
                              >
                                {field.label}: {field.value}
                              </Badge>
                            )
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-neutral-400">
                        {formatDistanceToNowStrict(new Date(event.at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
}