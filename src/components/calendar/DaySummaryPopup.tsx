"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/lib/types/calendar";

type Props = {
  selectedDate: string | null;
  panelPos: {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null;
  events: CalendarEvent[]; // ✅ FIXED
  babyId: string;
  onClose: () => void;
  parseDate: (date: string) => Date;
};

const ACTIVITY_TYPES = [
  { icon: "🍼", type: "feeding" },
  { icon: "😴", type: "sleep" },
  { icon: "🧷", type: "diaper" },
  { icon: "🛁", type: "bath" },
  { icon: "💊", type: "medicine" },
  { icon: "🎮", type: "play" },
  { icon: "🌡", type: "temperature" },
  { icon: "📏", type: "growth" },
  { icon: "🍼", type: "pumping" },
  { icon: "😪", type: "nap" },
];

function toLocalDateKey(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function DaySummaryPopup({
  selectedDate,
  panelPos,
  events,
  babyId,
  onClose,
  parseDate,
}: Props) {
  const router = useRouter();

  if (!selectedDate || !panelPos) return null;
  const activityIconMap = Object.fromEntries(
    ACTIVITY_TYPES.map((a) => [a.type, a.icon])
  );
  // 🧠 GROUP EVENTS (your exact logic preserved)
  const grouped = useMemo(() => {
    return Object.values(
      events.reduce((acc, e) => {
        const key = e.activityTypeSlug ?? e.type;

        if (!acc[key]) {
          acc[key] = {
            count: 0,
            icon:
              e.icon ??
              (e.type === "reminder"
                ? "⏰"
                : activityIconMap[e.activityTypeSlug || ""] || "•"),
            color: e.color ?? "#3b82f6",
            label: e.title,
          };
        }

        acc[key].count += 1;
        return acc;
      }, {} as Record<string, any>)
    );
  }, [events]);

  // 🧠 DATE RULES
  const today = new Date(new Date().toDateString());
  const selected = parseDate(selectedDate);
  const isPast = selected < today;
  const isFuture = selected > today;

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 8 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
      style={{
        position: "absolute",
        top: panelPos.top,
        left: panelPos.left,
        width: panelPos.width,
        maxHeight: panelPos.maxHeight,
        overflowY: "auto",
      }}
      className="
        day-summary-popup z-50 max-w-[92vw]
        rounded-2xl border border-neutral-200
        bg-white/80 backdrop-blur-xl
        p-4 sm:p-5
        shadow-[0_20px_70px_rgba(0,0,0,0.25)]
        space-y-5
      "
    >
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-800 tracking-tight">
          {parseDate(selectedDate).toDateString()}
        </h2>
  
        <Button
          variant="ghost"
          onClick={onClose}
          className="hover:bg-neutral-100 rounded-full w-8 h-8 p-0"
        >
          ✕
        </Button>
      </div>
  
      {/* SUMMARY GRID */}
      <div className="grid grid-cols-2 gap-3">
        {grouped.length === 0 && (
          <p className="text-sm text-neutral-400 col-span-2 text-center py-6">
            No activities or reminders
          </p>
        )}
  
        {grouped.map((g: any, i: number) => (
          <motion.div
            key={i}
            title={g.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="
              flex items-center justify-between
              rounded-xl border border-neutral-200
              px-3 py-2
              bg-white/70 backdrop-blur
              shadow-sm
              hover:shadow-md
              transition-all duration-200
              cursor-default
            "
          >
            {/* ICON */}
            <span
              className="text-xl drop-shadow-sm"
              style={{ color: g.color }}
            >
              {g.icon}
            </span>
  
            {/* COUNT */}
            <span className="text-sm font-semibold text-neutral-800">
              {g.count}
            </span>
          </motion.div>
        ))}
      </div>
  
      {/* ACTIONS */}
      <div className="border-t border-neutral-200 pt-4 space-y-2">
        <Button
          className="
            w-full
            bg-black text-white
            hover:bg-neutral-800
            transition-all
          "
          disabled={isFuture}
          onClick={() => {
            onClose();
            router.push(
              `/dashboard/${babyId}/activities/new?date=${selectedDate}`
            );
          }}
        >
          + Add Activity
        </Button>
  
        <Button
          variant="outline"
          className="
            w-full
            border-neutral-300
            hover:bg-neutral-50
          "
          disabled={isPast}
          onClick={() =>
            router.push(
              `/dashboard/${babyId}/reminders/new?date=${selectedDate}`
            )
          }
        >
          + Add Reminder
        </Button>
  
        {isPast && (
          <p className="text-xs text-neutral-400 text-center">
            Reminders can only be set for now or future
          </p>
        )}
        {isFuture && (
          <p className="text-xs text-neutral-400 text-center">
            Activities can only be logged for past or current time
          </p>
        )}
      </div>
  
      {/* VIEW DAY */}
      <Button
        className="
          w-full
          bg-neutral-100
          hover:bg-neutral-200
          text-neutral-800
        "
        onClick={() =>
          router.push(
            `/dashboard/${babyId}/calendar/day/${selectedDate}`
          )
        }
      >
        View Full Day →
      </Button>
    </motion.div>
  );  
}