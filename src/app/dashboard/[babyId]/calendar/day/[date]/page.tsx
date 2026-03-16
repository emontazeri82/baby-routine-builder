"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";

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
  ]);

  const result: MetadataField[] = [];
  const record = metadata as Record<string, unknown>;

  for (const [key, rawValue] of Object.entries(record)) {
    if (hiddenKeys.has(key)) continue;

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      result.push({ label: toTitleCase(key), value: String(rawValue) });
      continue;
    }

    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      const nested = rawValue as Record<string, unknown>;
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        if (
          typeof nestedValue === "string" ||
          typeof nestedValue === "number" ||
          typeof nestedValue === "boolean"
        ) {
          result.push({
            label: `${toTitleCase(key)} ${toTitleCase(nestedKey)}`,
            value: String(nestedValue),
          });
        }
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
    if (event.eventType === "feeding") return "🍼";
    if (event.eventType === "sleep" || event.eventType === "nap") return "😴";
    if (event.eventType === "diaper") return "💩";
    if (event.category === "activity") return "🟢";
    if (event.category === "reminder_triggered") return "🟡";
    return "⏰";
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {dayStartLocal.toDateString()}
          </h1>
          <p className="text-neutral-500">Daily Timeline</p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/dashboard/${babyId}/calendar`}>
            ← Back to Month
          </Link>
        </Button>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold">Daily Summary</h2>
        <div className="grid gap-3 text-sm text-neutral-600 sm:grid-cols-2 lg:grid-cols-3">
          <div>Activities logged: {stats?.activitiesLogged ?? 0}</div>
          <div>Reminders completed: {stats?.remindersCompleted ?? 0}</div>
          <div>Reminders skipped: {stats?.remindersSkipped ?? 0}</div>
          <div>Reminders snoozed: {stats?.remindersSnoozed ?? 0}</div>
          <div>Reminders expired: {stats?.remindersExpired ?? 0}</div>
          <div>Overdue reminders: {stats?.overdueReminders ?? 0}</div>
          <div>Active reminders: {stats?.activeReminders ?? 0}</div>
          <div>
            Avg response time:{" "}
            {stats?.averageResponseTimeMinutes == null
              ? "n/a"
              : `${stats.averageResponseTimeMinutes} min`}
          </div>
          <div>
            Completion rate:{" "}
            {stats?.completionRate == null
              ? "n/a"
              : `${Math.round(stats.completionRate * 100)}%`}
          </div>
          <div>Top activity: {stats?.mostActiveActivityType ?? "n/a"}</div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === "activity" ? "default" : "outline"}
            onClick={() => setFilter("activity")}
          >
            Activities
          </Button>
          <Button
            size="sm"
            variant={filter === "reminder" ? "default" : "outline"}
            onClick={() => setFilter("reminder")}
          >
            Reminders
          </Button>
          <Button
            size="sm"
            variant={filter === "trigger" ? "default" : "outline"}
            onClick={() => setFilter("trigger")}
          >
            Triggers
          </Button>
        </div>

        {isLoading && <p>Loading...</p>}

        {!isLoading && filteredTimeline.length === 0 && (
          <p className="text-neutral-500">No entries for this day.</p>
        )}

        <div className="space-y-6">
          {groupedTimeline.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {group.label}
              </div>
              <div className="space-y-3">
                {group.items.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 rounded-xl border bg-white p-4"
                  >
                    <div className="w-20 text-sm font-medium text-neutral-500">
                      {new Date(event.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="w-px bg-neutral-200 self-stretch" />
                    <div className="flex-1">
                      {(() => {
                        const metadataFields =
                          event.category === "activity"
                            ? getEnhancedMetadataFields(event.metadata)
                            : [];

                        return (
                          <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{categoryIcon(event)}</span>
                        <div className="font-semibold">{event.title}</div>
                        <Badge variant={statusBadgeVariant(event.status)}>
                          {statusBadgeLabel(event)}
                        </Badge>
                        {event.category === "activity" && (
                          <Badge variant="outline">
                            Source: {event.source === "reminder" ? "Reminder" : "Manual"}
                          </Badge>
                        )}
                      </div>
                      {event.subtitle && (
                        <div className="mt-1 text-sm text-neutral-500">
                          {event.subtitle}
                        </div>
                      )}
                      {event.scheduledFor && (
                        <div className="mt-1 text-xs text-neutral-400">
                          Scheduled: {new Date(event.scheduledFor).toLocaleTimeString()}
                        </div>
                      )}
                      {event.completedAt && (
                        <div className="mt-1 text-xs text-neutral-400">
                          Completed: {new Date(event.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                      {event.skippedAt && (
                        <div className="mt-1 text-xs text-neutral-400">
                          Skipped: {new Date(event.skippedAt).toLocaleTimeString()}
                        </div>
                      )}
                      {typeof event.delayMinutes === "number" && (
                        <div className="mt-1 text-xs text-neutral-400">
                          Delay: {event.delayMinutes >= 0 ? "+" : ""}
                          {event.delayMinutes} min
                        </div>
                      )}
                      {metadataFields.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {metadataFields.map((field) => (
                            <Badge key={`${event.id}-${field.label}`} variant="secondary">
                              {field.label}: {field.value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div
                        className="mt-1 text-xs text-neutral-400"
                        title={new Date(event.at).toLocaleString()}
                      >
                        {formatDistanceToNowStrict(new Date(event.at), { addSuffix: true })}
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
