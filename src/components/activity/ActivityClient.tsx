"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { isToday, isYesterday, isValid } from "date-fns";
import { Search, ArrowUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import QuickLogPanel from "./QuickLogPanel";

import ActivityItem from "./ActivityItem";
import type { ActivityListItem } from "./activityList.types";
import ActivityInsights from "../insights/ActivityInsights";

import axios from "axios";

function coerceActivityDates(a: ActivityListItem): ActivityListItem {
  return {
    ...a,
    startTime: a.startTime
      ? new Date(a.startTime as unknown as string | Date)
      : null,
    endTime: a.endTime
      ? new Date(a.endTime as unknown as string | Date)
      : null,
    updatedAt: a.updatedAt
      ? new Date(a.updatedAt as string | Date)
      : null,
  };
}

export default function ActivityClient({
  babyId,
  activities = [],
  babyName,
}: {
  babyId: string;
  activities?: ActivityListItem[];
  babyName: string;
}) {
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [localActivities, setLocalActivities] = useState<ActivityListItem[]>(() =>
    activities.map(coerceActivityDates)
  );
  const activityRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /** RSC re-fetch / router.refresh() — sync when server data changes (id, time, label, notes). */
  const serverListSignature = (activities ?? [])
    .map((a) => {
      const start = a.startTime instanceof Date ? a.startTime.getTime() : String(a.startTime);
      const upd =
        a.updatedAt instanceof Date
          ? a.updatedAt.getTime()
          : a.updatedAt != null
            ? String(a.updatedAt)
            : "";
      return `${a.id}@${start}#${a.activityName ?? ""}#${upd}`;
    })
    .join("|");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- serverListSignature encodes `activities` content
  useEffect(() => {
    if (!Array.isArray(activities)) return;
    setLocalActivities(activities.map(coerceActivityDates));
  }, [serverListSignature]);

  function addActivityOptimistically(newActivity: ActivityListItem) {
    setLocalActivities((prev) => [newActivity, ...prev]);
  }

  const filteredActivities = useMemo(() => {
    let result = [...localActivities];

    if (search.trim()) {
      result = result.filter((a) =>
        a.activityName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const ta = a.startTime
        ? new Date(a.startTime as string | Date).getTime()
        : 0;
      const tb = b.startTime
        ? new Date(b.startTime as string | Date).getTime()
        : 0;
      return sortBy === "newest" ? tb - ta : ta - tb;
    });

    return result;
  }, [localActivities, sortBy, search]);

  const groupedActivities = useMemo(() => {
    const today: ActivityListItem[] = [];
    const yesterday: ActivityListItem[] = [];
    const older: ActivityListItem[] = [];

    filteredActivities.forEach((activity) => {
      if (activity.startTime == null) {
        older.push(activity);
        return;
      }
      if (typeof activity.startTime === "string" && !activity.startTime.trim()) {
        older.push(activity);
        return;
      }

      const date = new Date(activity.startTime);
      if (!isValid(date)) {
        older.push(activity);
        return;
      }

      if (isToday(date)) today.push(activity);
      else if (isYesterday(date)) yesterday.push(activity);
      else older.push(activity);
    });

    return { today, yesterday, older };
  }, [filteredActivities]);

  const totalToday = localActivities.filter((a) => {
    if (a.startTime == null) return false;
    if (typeof a.startTime === "string" && !a.startTime.trim()) return false;
    const d = new Date(a.startTime);
    return isValid(d) && isToday(d);
  }).length;

  async function handleEndActivity(activityId: string) {
    try {
      const url = `/api/activities/${activityId}`;
      console.log("[Axios] Calling:", url);

      await axios.patch(url, {
        endTime: new Date().toISOString(),
      });

      setLocalActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, endTime: new Date() } : a))
      );
    } catch (err) {
      console.error("[Axios] Error at:", `/api/activities/${activityId}`, err);
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 🌈 BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        {/* base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />

        {/* glow blobs */}
        <div className="absolute top-[-120px] left-[-120px] w-[320px] h-[320px] bg-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] w-[320px] h-[320px] bg-purple-300/30 rounded-full blur-3xl" />
      </div>

      {/* 🧠 YOUR ORIGINAL CONTENT */}
      <div className="relative space-y-6 p-4 pb-36 sm:space-y-8 sm:p-6 sm:pb-40 lg:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-w-0"
        >
          <h1 className="text-2xl font-bold sm:text-3xl">
            {babyName} — Activities
          </h1>
          <p className="text-neutral-500">
            Track your baby&apos;s daily routine
          </p>
        </motion.div>

        {/* 🔥 ADD THIS RIGHT HERE */}
        <ActivityInsights activities={localActivities} />
        <QuickLogPanel
          babyId={babyId}
          onActivityCreated={addActivityOptimistically}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <StatCard title="Total" value={localActivities.length} />
          <StatCard title="Today" value={totalToday} />
        </div>

        <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 backdrop-blur-sm bg-white/70 dark:bg-neutral-900/70">
          <Button
            className="w-full sm:w-auto"
            onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
          >
            {sortBy}
          </Button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2 w-4 h-4" />
            <Input
              className="pl-7"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <ActivityGroup
            title="Today"
            activities={groupedActivities.today}
            onEnd={handleEndActivity}
          />

          <ActivityGroup
            title="Yesterday"
            activities={groupedActivities.yesterday}
            onEnd={handleEndActivity}
          />

          {/* 🔥 OLDER WITH LIMIT */}
          <motion.div
            layout="position"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ActivityGroup
              title="Older"
              activities={groupedActivities.older.slice(0, visibleCount)}
              onEnd={handleEndActivity}
              activityRefs={activityRefs}
            />
          </motion.div>

          {filteredActivities.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">
              {search.trim()
                ? "No activities match your search."
                : "No activities yet. Log one with the buttons above."}
            </p>
          )}

          {groupedActivities.older.length > 5 && (
            <div className="text-center mt-3 space-y-1">
              {/* ✅ Progress indicator */}
              <p className="text-xs text-neutral-500">
                Showing {Math.min(visibleCount, groupedActivities.older.length)} of{" "}
                {groupedActivities.older.length}
              </p>

              {/* ✅ View More */}
              <div className="flex justify-center items-center gap-4 mt-1">
                {/* ✅ View More */}
                {visibleCount < groupedActivities.older.length && (
                  <Button
                    variant="link"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(prev + 5, groupedActivities.older.length)
                      )
                    }
                    className="text-sm p-0 h-auto"
                  >
                    View More
                  </Button>
                )}

                {/* ✅ Show Less */}
                {visibleCount > 5 && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setVisibleCount((prev) => Math.max(prev - 5, 5));
                    }}
                    className="text-sm p-0 h-auto"
                  >
                    Show Less
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showTopBtn && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="rounded-full shadow-lg flex items-center gap-1"
          >
            <ArrowUp className="w-4 h-4" />
            Top
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function ActivityGroup({
  title,
  activities,
  onEnd,
  activityRefs,
}: {
  title: string;
  activities: ActivityListItem[];
  onEnd: (id: string) => void;
  activityRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  if (!activities.length) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b pb-1 mb-2">
        {title}
      </h3>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            ref={(el) => {
              if (el && activityRefs && title === "Older") {
                activityRefs.current[activity.id] = el;
              }
            }}
          >
            <ActivityItem activity={activity} onEnd={onEnd} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-4">
      <p>{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
