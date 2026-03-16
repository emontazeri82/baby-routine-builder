"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/lib/types/calendar";

type CalendarApiResponse = {
  timezone: string;
  events: CalendarEvent[];
};

function isoRangeForMonth(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function toLocalDateKey(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKeyLocal(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export default function BabyCalendarPage() {
  const params = useParams();
  const babyId = params.babyId as string;
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showActivities, setShowActivities] = useState(true);
  const [showReminders, setShowReminders] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const calendarWrapRef = useRef<HTMLDivElement | null>(null);

  const range = useMemo(() => isoRangeForMonth(currentDate), [currentDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["calendar", babyId, range.start, range.end],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?babyId=${babyId}&start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
      );
      if (!res.ok) throw new Error("Failed to load calendar");
      return (await res.json()) as CalendarApiResponse;
    },
  });

  const events = useMemo(() => {
    const all = data?.events ?? [];
    return all.filter((e) => {
      if (e.type === "activity" && !showActivities) return false;
      if (e.type === "reminder" && !showReminders) return false;
      return true;
    });
  }, [data?.events, showActivities, showReminders]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => (e.dayKey ?? toLocalDateKey(e.start)) === selectedDate);
  }, [events, selectedDate]);

  function renderDayBadges(dayEl: Element, date: Date, eventList: CalendarEvent[]) {
    const dateStr = toLocalDateKey(date);
    const counts = eventList.reduce(
      (acc, e) => {
        if ((e.dayKey ?? toLocalDateKey(e.start)) !== dateStr) return acc;
        if (e.type === "activity") acc.activities++;
        if (e.type === "reminder") acc.reminders++;
        return acc;
      },
      { activities: 0, reminders: 0 }
    );

    const frame = dayEl.querySelector(".fc-daygrid-day-frame");
    if (!frame) return;

    const existing = frame.querySelector(".custom-day-badges");
    if (existing) existing.remove();

    const badgeWrapper = document.createElement("div");
    badgeWrapper.className =
      "custom-day-badges absolute bottom-2 left-2 flex flex-col gap-1";

    if (counts.activities > 0) {
      const act = document.createElement("div");
      act.className =
        "text-[10px] sm:text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5";
      act.innerText = `Activities ${counts.activities}`;
      badgeWrapper.appendChild(act);
    }

    if (counts.reminders > 0) {
      const rem = document.createElement("div");
      rem.className =
        "text-[10px] sm:text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5";
      rem.innerText = `Reminders ${counts.reminders}`;
      badgeWrapper.appendChild(rem);
    }

    if (counts.activities === 0 && counts.reminders === 0) {
      const dash = document.createElement("div");
      dash.className = "text-[10px] text-neutral-300";
      dash.innerText = "-";
      badgeWrapper.appendChild(dash);
    }

    (frame as HTMLElement).style.position = "relative";
    frame.appendChild(badgeWrapper);
  }

  useEffect(() => {
    const wrap = calendarWrapRef.current;
    if (!wrap) return;

    const dayCells = wrap.querySelectorAll(".fc-daygrid-day");
    dayCells.forEach((cell) => {
      const dateAttr = (cell as HTMLElement).dataset.date;
      if (!dateAttr) return;
      renderDayBadges(cell, new Date(`${dateAttr}T00:00:00`), events);
    });
  }, [events]);

  function openPanelAt(date: string, anchorEl: HTMLElement) {
    const normalizedDate =
      date.length > 10 ? toLocalDateKey(date) : date;

    const wrap = calendarWrapRef.current;
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const PANEL_WIDTH = Math.max(
      280,
      Math.min(380, wrapRect.width - 16, window.innerWidth - 16)
    );
    const PANEL_HEIGHT = Math.max(280, Math.min(460, window.innerHeight - 24));
    const GAP = 12;

    let left = anchorRect.right - wrapRect.left + GAP;
    let top = anchorRect.top - wrapRect.top;

    const maxLeft = wrapRect.width - PANEL_WIDTH - GAP;
    if (left > maxLeft) {
      left = anchorRect.left - wrapRect.left - PANEL_WIDTH - GAP;
    }

    left = Math.max(GAP, Math.min(left, maxLeft));

    const maxTop = wrapRect.height - PANEL_HEIGHT - GAP;
    top = Math.max(GAP, Math.min(top, maxTop));

    setSelectedDate(normalizedDate);
    setPanelPos({
      top,
      left,
      width: PANEL_WIDTH,
      maxHeight: PANEL_HEIGHT,
    });
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-neutral-500">Activities + Reminders</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showActivities ? "default" : "outline"}
            onClick={() => setShowActivities((v) => !v)}
            className="h-8 px-3 text-xs sm:h-9 sm:text-sm"
          >
            Activities
          </Button>

          <Button
            variant={showReminders ? "default" : "outline"}
            onClick={() => setShowReminders((v) => !v)}
            className="h-8 px-3 text-xs sm:h-9 sm:text-sm"
          >
            Reminders
          </Button>

          <Button asChild className="h-8 px-3 text-xs sm:h-9 sm:text-sm">
            <Link href={`/dashboard/${babyId}/reminders/new`}>+ Reminder</Link>
          </Button>

          <Button asChild variant="outline" className="h-8 px-3 text-xs sm:h-9 sm:text-sm">
            <Link href={`/dashboard/${babyId}/activities/new`}>+ Activity</Link>
          </Button>
        </div>
      </div>

      <Card className="p-3">
        {!isLoading && !error && (
          <div ref={calendarWrapRef} className="relative">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"

              // 👉 IMPORTANT: hide default event rendering
              eventDisplay="none"

              dayCellDidMount={(arg) => {
                renderDayBadges(arg.el, arg.date, events);
              }}

              // 👉 Open summary popup
              dateClick={(arg) =>
                openPanelAt(toLocalDateKey(arg.date), arg.dayEl)
              }

              events={events.map((e) => ({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                extendedProps: { ...e },
              }))}

              datesSet={(arg) => setCurrentDate(new Date(arg.start))}
            />

            {/* SUMMARY POPUP */}
            {selectedDate && panelPos && (
              <motion.div
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  top: panelPos.top,
                  left: panelPos.left,
                  width: panelPos.width,
                  maxHeight: panelPos.maxHeight,
                  overflowY: "auto",
                }}
                className="z-50 max-w-[92vw] rounded-2xl border border-neutral-300 bg-white p-4 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    {parseDateKeyLocal(selectedDate).toDateString()}
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedDate(null);
                      setPanelPos(null);
                    }}
                  >
                    ✕
                  </Button>
                </div>

                {/* SUMMARY GROUPING */}
                <div className="space-y-3">
                  {Object.values(
                    selectedDayEvents.reduce((acc, e) => {
                      const key = e.activityTypeSlug ?? e.type;
                      if (!acc[key]) {
                        acc[key] = {
                          count: 0,
                          icon:
                            e.icon ?? (e.type === "reminder" ? "⏰" : "•"),
                          color: e.color ?? "#3b82f6",
                          label: e.title,
                        };
                      }
                      acc[key].count += 1;
                      return acc;
                    }, {} as Record<
                      string,
                      { count: number; icon: string; color: string; label: string }
                    >)
                  ).map((g, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: g.color }}>{g.icon}</span>
                        <span>{g.label}</span>
                      </div>
                      <span className="font-semibold">{g.count}</span>
                    </div>
                  ))}
                </div>

                {/* VIEW FULL DAY BUTTON */}
                <div className="mt-4">
                  <Button
                    className="w-full"
                    onClick={() =>
                      router.push(
                        `/dashboard/${babyId}/calendar/day/${selectedDate}`
                      )
                    }
                  >
                    View Full Day →
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
