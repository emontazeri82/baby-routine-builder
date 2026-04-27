"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/lib/types/calendar";

import DaySummaryPopup from "@/components/calendar/DaySummaryPopup";
type CalendarApiResponse = {
  timezone: string;
  events: CalendarEvent[];
};

function isoRangeExpanded(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59);
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
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!calendarWrapRef.current) return;

      const popup = calendarWrapRef.current.querySelector(
        ".day-summary-popup"
      );

      if (popup && !popup.contains(e.target as Node)) {
        setSelectedDate(null);
        setPanelPos(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const range = useMemo(() => isoRangeExpanded(currentDate), [currentDate]);

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
  function createBadge(count: number, color: string, icon: string) {
    const badge = document.createElement("div");

    badge.innerText = `${icon} ${count}`;

    badge.style.background = "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))";
    badge.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
    badge.style.backdropFilter = "blur(6px)";
    badge.style.color = color;
    badge.style.border = `1px solid ${color}`;
    badge.style.borderRadius = "999px";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.fontWeight = "600";
    badge.style.whiteSpace = "nowrap";
    badge.style.transition = "all 0.2s ease";
    badge.onmouseenter = () => {
      badge.style.transform = "scale(1.08)";
    };
    badge.onmouseleave = () => {
      badge.style.transform = "scale(1)";
    };
    // 🔥 better scaling
    const isMobile = window.innerWidth < 640;
    const isLarge = window.innerWidth > 1200;

    if (isMobile) {
      badge.style.fontSize = "10px";
      badge.style.padding = "1px 4px";
    } else if (isLarge) {
      badge.style.fontSize = "13px";
      badge.style.padding = "3px 8px";
    } else {
      badge.style.fontSize = "11px";
      badge.style.padding = "2px 6px";
    }

    return badge;
  }
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

    // 🔥 compact container (bottom-right instead of left)
    badgeWrapper.style.position = "absolute";
    badgeWrapper.style.bottom = "2px";
    badgeWrapper.style.right = "2px";
    badgeWrapper.style.display = "flex";
    badgeWrapper.style.flexDirection = "column";
    badgeWrapper.style.gap = "2px";

    // ✅ limit badges (important for mobile)
    const MAX_BADGES = window.innerWidth < 640 ? 2 : 3;
    let badgeCount = 0;

    if (counts.activities > 0 && badgeCount < MAX_BADGES) {
      badgeWrapper.appendChild(
        createBadge(counts.activities, "#0ea5e9", "🍼")
      );
      badgeCount++;
    }

    if (counts.reminders > 0 && badgeCount < MAX_BADGES) {
      badgeWrapper.appendChild(
        createBadge(counts.reminders, "#f59e0b", "⏰")
      );
      badgeCount++;
    }

    // fallback
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
    <div className="w-full min-w-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <div className="space-y-4 px-2 sm:px-4 lg:px-6 xl:px-8 w-full min-w-0">
  
        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Calendar
            </h1>
  
            <p className="text-sm text-neutral-500">
              Track activities & reminders in one place
            </p>
          </div>
  
          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
  
            <Button
              variant={showActivities ? "default" : "outline"}
              className={`
                transition-all duration-200
                hover:scale-[1.03] active:scale-[0.96]
                ${showActivities ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
              `}
              onClick={() => setShowActivities((v) => !v)}
            >
              Activities
            </Button>
  
            <Button
              variant={showReminders ? "default" : "outline"}
              className={`
                transition-all duration-200
                hover:scale-[1.03] active:scale-[0.96]
                ${showReminders ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
              `}
              onClick={() => setShowReminders((v) => !v)}
            >
              Reminders
            </Button>
  
            <Button
              asChild
              className="h-8 px-3 text-xs sm:h-9 sm:text-sm hover:scale-[1.03] active:scale-[0.96] transition"
            >
              <Link href={`/dashboard/${babyId}/reminders/new`}>
                + Reminder
              </Link>
            </Button>
  
            <Button
              asChild
              variant="outline"
              className="h-8 px-3 text-xs sm:h-9 sm:text-sm hover:scale-[1.03] active:scale-[0.96] transition"
            >
              <Link href={`/dashboard/${babyId}/activities/new`}>
                + Activity
              </Link>
            </Button>
          </div>
        </div>
  
        {/* CALENDAR CARD */}
        <div className="transition-all duration-300 hover:shadow-[0_25px_70px_rgba(0,0,0,0.18)] rounded-2xl">
          <Card
            className="
              p-2 sm:p-3 lg:p-4 
              w-full max-w-none 
              overflow-hidden
              bg-white/80 backdrop-blur-md
              border border-white/40
              shadow-[0_20px_60px_rgba(0,0,0,0.12)]
              rounded-2xl
              transition-all duration-300
            "
          >
  
            {/* LOADING STATE */}
            {isLoading && (
              <div className="flex items-center justify-center h-[300px] text-neutral-400 animate-pulse">
                Loading calendar...
              </div>
            )}
  
            {/* ERROR STATE */}
            {error && (
              <div className="flex items-center justify-center h-[300px] text-red-400">
                Failed to load calendar
              </div>
            )}
  
            {/* CALENDAR */}
            {!isLoading && !error && (
              <div
                ref={calendarWrapRef}
                className="
                  relative w-full h-full
                  rounded-xl
                  overflow-hidden
                  shadow-inner
                "
              >
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  height="auto"
                  contentHeight="auto"
                  expandRows={true}
                  handleWindowResize={true}
                  showNonCurrentDates={true}
                  fixedWeekCount={false}
  
                  /* 🔥 Smooth cell interaction */
                  dayCellClassNames={() =>
                    "transition-all duration-200 cursor-pointer rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
                  }
  
                  /* Hide default events */
                  eventDisplay="none"
  
                  /* Render badges */
                  dayCellDidMount={(arg) => {
                    renderDayBadges(arg.el, arg.date, events);
                  }}
  
                  /* Click interaction */
                  dateClick={(arg) => {
                    openPanelAt(toLocalDateKey(arg.date), arg.dayEl);
                  }}
  
                  /* Events mapping */
                  events={events.map((e) => ({
                    id: e.id,
                    title: e.title,
                    start: e.start,
                    end: e.end,
                    extendedProps: { ...e },
                  }))}
  
                  /* Month navigation */
                  datesSet={(arg) => {
                    setCurrentDate(new Date(arg.start));
                  }}
                />
  
                {/* POPUP */}
                {selectedDate && panelPos && (
                  <DaySummaryPopup
                    selectedDate={selectedDate}
                    panelPos={panelPos}
                    events={selectedDayEvents}
                    babyId={babyId}
                    parseDate={parseDateKeyLocal}
                    onClose={() => {
                      setSelectedDate(null);
                      setPanelPos(null);
                    }}
                  />
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
