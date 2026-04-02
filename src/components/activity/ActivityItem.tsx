"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ACTIVITY_CONFIG } from "@/lib/activityConfig";
import { useLiveDuration } from "@/hooks/useLiveDuration";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";
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
  const config = ACTIVITY_CONFIG[activity.activityName || ""] ?? {
    isDuration: false,
    allowEnd: false,
  };

  const isActive =
    config?.isDuration && !activity.endTime;

    const start = activity.startTime
    ? new Date(activity.startTime)
    : null;

  const end = activity.endTime
    ? new Date(activity.endTime)
    : null;

  const liveSeconds = useLiveDuration(start);

  const sameTime =
    start && end && start.getTime() === end.getTime();

  const finalDuration =
    start && end
      ? Math.floor((end.getTime() - start.getTime()) / 1000)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={`flex flex-col gap-4 p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
          ${isActive
          ? "border-green-500 bg-green-50 shadow-md"
          : "border border-neutral-200 hover:shadow-md hover:-translate-y-[1px]"
        }`}
      >
        {/* LEFT SIDE */}
        <div className="min-w-0 flex-1">
          {/* TITLE */}
          <h4 className="flex flex-wrap items-center gap-2 font-semibold text-base sm:text-lg">
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
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 animate-pulse">
                LIVE
              </span>
            )}
          </h4>

          {/* TIME DISPLAY */}
          <div className="text-sm text-neutral-600 mt-2">
            {isActive ? (
              <>
                {/* ACTIVE */}
                <div className="text-green-600 font-bold text-xl tracking-tight">
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
            <p className="mt-2 break-words text-sm text-neutral-600 leading-relaxed line-clamp-3">
              {activity.notes}
            </p>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end min-w-0">
          <Button asChild variant="outline" className="flex-1 sm:flex-none min-h-[44px] rounded-lg">
            <Link
              href={`/dashboard/${activity.babyId}/activities/new/${activity.activityName?.toLowerCase()}?editId=${activity.id}`}
            >
              Edit
            </Link>
          </Button>

          {config?.allowEnd && !activity.endTime && onEnd && (
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
