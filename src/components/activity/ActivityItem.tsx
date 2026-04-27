"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  differenceInMinutes,
  format,
  formatDistanceToNow,
  isValid,
} from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ACTIVITY_CONFIG } from "@/lib/activityConfig";
import { useLiveDuration } from "@/hooks/useLiveDuration";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";
import type { ActivityListItem } from "./activityList.types";
/* ================= UTILS ================= */

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseActivityTimestamp(
  value: string | Date | null | undefined
): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (!isValid(d)) return null;
  return d;
}

/* ================= COMPONENT ================= */

export default function ActivityItem({
  activity,
  onEnd,
}: {
  activity: ActivityListItem;
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
  const updatedAt = parseActivityTimestamp(
    activity.updatedAt as string | Date | null | undefined
  );
  const now = new Date();
  const isFutureUpdate = Boolean(
    updatedAt && updatedAt.getTime() > now.getTime()
  );
  const minutesSinceUpdate =
    updatedAt && !isFutureUpdate
      ? Math.max(0, differenceInMinutes(now, updatedAt))
      : updatedAt
        ? 0
        : null;
  const isStale = minutesSinceUpdate !== null && minutesSinceUpdate > 10;
  const showFreshness = Boolean(updatedAt);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className={`
      flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between
      rounded-2xl border transition-all duration-200
      ${isActive
            ? "border-green-400 bg-green-50/70 shadow-lg"
            : "border-neutral-200 bg-white hover:shadow-lg"
          }
    `}
      >
        {/* LEFT SIDE */}
        <div className="min-w-0 flex-1">
          {/* TITLE */}
          <h4 className="flex flex-wrap items-center gap-2 font-semibold text-base sm:text-lg">
            {/* ICON */}
            <span className="text-lg">
              {ACTIVITY_ICONS[activity.activityName || ""] || "📝"}
            </span>

            {/* LABEL */}
            <span
              className={`px-2.5 py-0.5 rounded-md text-sm font-medium
            ${ACTIVITY_COLORS[activity.activityName || ""] || ""}
          `}
            >
              {activity.activityName || "Activity"}
            </span>

            {/* LIVE BADGE */}
            {isActive && (
              <motion.span
                initial={{ scale: 0.9 }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
              bg-green-100 text-green-700 shadow-sm"
              >
                LIVE
              </motion.span>
            )}
          </h4>

          {/* TIME DISPLAY */}
          <div className="text-sm text-neutral-600 mt-2 space-y-1">
            {isActive ? (
              <>
                <div className="text-green-600 font-bold text-2xl tracking-tight">
                  {formatDuration(liveSeconds)}
                  <span className="ml-2 text-xs font-normal text-green-700">
                    Running
                  </span>
                </div>

                <div className="text-xs text-neutral-500">
                  Started: {start && format(start, "p")}
                </div>
              </>
            ) : (
              <>
                {finalDuration > 0 && !sameTime && (
                  <div className="font-semibold text-lg text-neutral-800">
                    {formatDuration(finalDuration)}
                  </div>
                )}

                {start && end && !sameTime && (
                  <div className="text-xs text-neutral-500">
                    {format(start, "p")} → {format(end, "p")}
                  </div>
                )}

                {start && sameTime && (
                  <div className="text-xs text-neutral-400">
                    Logged at {format(start, "p")}
                  </div>
                )}
              </>
            )}
          </div>

          {showFreshness && updatedAt && (
            <div
              className={`text-[11px] mt-1 ${
                isStale ? "text-orange-500" : "text-neutral-400"
              }`}
            >
              {isStale
                ? "May be outdated"
                : isFutureUpdate
                  ? "Updated just now"
                  : `Updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}`}
            </div>
          )}
          {/* NOTES */}
          {activity.notes && (
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed line-clamp-3">
              {activity.notes}
            </p>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
          <Button
            asChild
            variant="outline"
            className="flex-1 sm:flex-none min-h-[44px] rounded-xl hover:bg-neutral-50"
          >
            <Link
              href={`/dashboard/${activity.babyId}/activities/new/${activity.activityName?.toLowerCase()}?editId=${activity.id}`}
            >
              Edit
            </Link>
          </Button>

          {config?.allowEnd && !activity.endTime && onEnd && (
            <Button
              className="flex-1 sm:flex-none min-h-[44px]
            bg-green-600 text-white hover:bg-green-700
            shadow-sm hover:shadow-md transition-all"
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
