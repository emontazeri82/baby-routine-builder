"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarEvent } from "@/lib/types/calendar";

export default function BabyDayPage() {
  const params = useParams();
  const babyId = params.babyId as string;
  const date = params.date as string; // format: YYYY-MM-DD

  const start = new Date(date + "T00:00:00").toISOString();
  const end = new Date(date + "T23:59:59").toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-day", babyId, start, end],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?babyId=${babyId}&start=${encodeURIComponent(
          start
        )}&end=${encodeURIComponent(end)}`
      );
      if (!res.ok) throw new Error("Failed to load day");
      return (await res.json()) as CalendarEvent[];
    },
  });

  const events = useMemo(() => {
    const all = data ?? [];
    return [...all].sort(
      (a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [data]);

  const summary = useMemo(() => {
    return events.reduce((acc, e) => {
      const key = e.type === "reminder" ? "Reminders" : "Activities";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [events]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {new Date(date).toDateString()}
          </h1>
          <p className="text-neutral-500">Daily Timeline</p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/dashboard/${babyId}/calendar`}>
            ← Back to Month
          </Link>
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="p-5 space-y-2">
        <h2 className="text-lg font-semibold">Daily Summary</h2>
        <div className="flex gap-6 text-sm text-neutral-600">
          <div>Activities: {summary["Activities"] ?? 0}</div>
          <div>Reminders: {summary["Reminders"] ?? 0}</div>
          <div>Total Entries: {events.length}</div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        {isLoading && <p>Loading...</p>}

        {!isLoading && events.length === 0 && (
          <p className="text-neutral-500">No entries for this day.</p>
        )}

        <div className="space-y-4">
          {events.map((e) => (
            <div
              key={e.id}
              className={`
                flex items-start gap-4
                rounded-xl border p-4
                ${
                  e.type === "reminder"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white"
                }
              `}
            >
              {/* Time Column */}
              <div className="w-20 text-sm font-medium text-neutral-500">
                {new Date(e.start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Vertical line */}
              <div className="w-px bg-neutral-200 self-stretch" />

              {/* Content */}
              <div className="flex-1">
                <div className="font-semibold">
                  {e.type === "reminder" ? "⏰ " : ""}
                  {e.title}
                </div>

                {e.notes && (
                  <div className="text-sm text-neutral-500 mt-1">
                    {e.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
