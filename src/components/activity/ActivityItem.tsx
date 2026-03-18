"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ACTIVITY_CONFIG } from "@/lib/activityConfig";
import { useLiveDuration } from "@/hooks/useLiveDuration";

/* ================= ICONS ================= */

const ACTIVITY_ICONS: Record<string, string> = {
  Feeding: "🍼",
  Sleep: "😴",
  Nap: "💤",
  Diaper: "🧷",
  Play: "🧸",
  Bath: "🛁",
  Medicine: "💊",
  Temperature: "🌡️",
  Growth: "📏",
  Pumping: "🧴",
};

/* ================= COLORS ================= */

const ACTIVITY_COLORS: Record<string, string> = {
  Sleep: "bg-blue-100 text-blue-700",
  Feeding: "bg-yellow-100 text-yellow-700",
  Diaper: "bg-purple-100 text-purple-700",
  Play: "bg-pink-100 text-pink-700",
  Bath: "bg-cyan-100 text-cyan-700",
  Medicine: "bg-red-100 text-red-700",
};

/* ================= UTILS ================= */

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ================= TYPES ================= */

type Activity = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  notes: string | null;
  babyId: string;
  activityName: string | null;
};

/* ================= COMPONENT ================= */

export default function ActivityItem({
  activity,
  onEnd,
}: {
  activity: Activity;
  onEnd?: (id: string) => void;
}) {
  const config =
    ACTIVITY_CONFIG[activity.activityName || ""];

  const isActive = !activity.endTime;

  const liveSeconds = useLiveDuration(activity.startTime);

  const start = activity.startTime
    ? new Date(activity.startTime)
    : null;

  const end = activity.endTime
    ? new Date(activity.endTime)
    : null;

  const sameTime =
    start && end && start.getTime() === end.getTime();

  const finalDuration =
    start && end
      ? Math.floor((end.getTime() - start.getTime()) / 1000)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`flex flex-col items-start gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between
        ${isActive
            ? "border-green-500 bg-green-50 shadow-md"
            : "hover:shadow-sm"
          }`}
      >
        {/* LEFT SIDE */}
        <div className="min-w-0 flex-1">
          {/* TITLE */}
          <h4 className="flex flex-wrap items-center gap-2 font-semibold min-w-0">
            <span>
              {ACTIVITY_ICONS[activity.activityName || ""] || "📝"}
            </span>

            <span
              className={`px-2 py-0.5 rounded text-sm ${ACTIVITY_COLORS[activity.activityName || ""] || ""
                }`}
            >
              {activity.activityName || "Activity"}
            </span>

            {/* LIVE badge */}
            {isActive && (
              <span className="text-xs text-green-600 font-semibold ml-2">
                ● LIVE
              </span>
            )}
          </h4>

          {/* TIME DISPLAY */}
          <div className="text-sm text-neutral-600 mt-2">
            {isActive ? (
              <>
                {/* ACTIVE */}
                <div className="text-green-600 font-semibold text-lg">
                  {formatDuration(liveSeconds)}
                  <span className="ml-2 text-xs font-normal">
                    Running
                  </span>
                </div>

                <div className="text-xs mt-1">
                  Started: {start && format(start, "p")}
                </div>
              </>
            ) : (
              <>
                {/* NORMAL duration */}
                {finalDuration > 0 && !sameTime && (
                  <div className="font-semibold text-lg">
                    {formatDuration(finalDuration)}
                  </div>
                )}

                {/* timeline ONLY if times differ */}
                {start && end && !sameTime && (
                  <div className="text-xs mt-1">
                    {format(start, "p")} → {format(end, "p")}
                  </div>
                )}

                {/* clean fallback */}
                {start && sameTime && (
                  <div className="text-xs mt-1 text-neutral-500">
                    Logged at {format(start, "p")}
                  </div>
                )}
              </>
            )}
          </div>

          {/* NOTES */}
          {activity.notes && (
            <p className="mt-2 break-words text-sm text-neutral-700 line-clamp-3">
              {activity.notes}
            </p>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end min-w-0">
          <Button asChild variant="outline" className="flex-1 sm:flex-none min-h-[44px]">
            <Link
              href={`/dashboard/${activity.babyId}/activities/new/${activity.activityName?.toLowerCase()}?editId=${activity.id}`}
            >
              Edit
            </Link>
          </Button>

          {config?.allowEnd && isActive && onEnd && (
            <Button
              className="flex-1 bg-green-600 text-white hover:bg-green-700 sm:flex-none min-h-[44px]"
              onClick={() => onEnd(activity.id)}
            >
              End
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
