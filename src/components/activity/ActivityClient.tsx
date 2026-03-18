"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { isToday, isYesterday } from "date-fns";
import { Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import QuickLogPanel from "./QuickLogPanel";
import FloatingQuickLogDock from "./FloatingQuickLogDock";
import ActivityItem from "./ActivityItem";

import axios from "axios";

type Activity = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  notes: string | null;
  babyId: string;
  activityName: string | null;
};

export default function ActivityClient({
  activities,
  babyName,
}: {
  activities: Activity[];
  babyName: string;
}) {
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [localActivities, setLocalActivities] = useState(activities);

  const babyId = localActivities[0]?.babyId;

  function addActivityOptimistically(newActivity: Activity) {
    setLocalActivities((prev) => [newActivity, ...prev]);
  }

  const filteredActivities = useMemo(() => {
    let result = [...localActivities];

    if (search.trim()) {
      result = result.filter((a) =>
        a.activityName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    result.sort((a, b) =>
      sortBy === "newest"
        ? (b.startTime?.getTime() || 0) -
        (a.startTime?.getTime() || 0)
        : (a.startTime?.getTime() || 0) -
        (b.startTime?.getTime() || 0)
    );

    return result;
  }, [localActivities, sortBy, search]);

  const groupedActivities = useMemo(() => {
    const today: Activity[] = [];
    const yesterday: Activity[] = [];
    const older: Activity[] = [];

    filteredActivities.forEach((activity) => {
      if (!activity.startTime) return;

      const date = new Date(activity.startTime);

      if (isToday(date)) today.push(activity);
      else if (isYesterday(date)) yesterday.push(activity);
      else older.push(activity);
    });

    return { today, yesterday, older };
  }, [filteredActivities]);

  const totalToday = localActivities.filter((a) =>
    a.startTime ? isToday(new Date(a.startTime)) : false
  ).length;

  async function handleEndActivity(activityId: string) {
    try {
      const url = `/api/activities/${activityId}`;
      console.log("[Axios] Calling:", url);

      const res = await axios.patch(url, {
        endTime: new Date().toISOString(),
      });

      setLocalActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? { ...a, endTime: new Date() }
            : a
        )
      );
    } catch (err) {
      console.error("[Axios] Error at:", `/api/activities/${activityId}`, err);
    }
  }

  return (
    <div className="space-y-6 p-4 pb-36 sm:space-y-8 sm:p-6 sm:pb-40 lg:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-w-0"
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{babyName} — Activities</h1>
        <p className="text-neutral-500">
          Track your baby's daily routine
        </p>
      </motion.div>

      {babyId && (
        <QuickLogPanel
          babyId={babyId}
          onActivityCreated={addActivityOptimistically}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard title="Total" value={localActivities.length} />
        <StatCard title="Today" value={totalToday} />
      </div>

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <Button
          className="w-full sm:w-auto"
          onClick={() =>
            setSortBy(sortBy === "newest" ? "oldest" : "newest")
          }
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
        <ActivityGroup title="Today" activities={groupedActivities.today} onEnd={handleEndActivity} />
        <ActivityGroup title="Yesterday" activities={groupedActivities.yesterday} onEnd={handleEndActivity} />
        <ActivityGroup title="Older" activities={groupedActivities.older} onEnd={handleEndActivity} />
      </div>
      {localActivities.length === 0 && (
        <div className="text-center text-neutral-400 py-10">
          No activities yet
        </div>
      )}

      {babyId && (
        <FloatingQuickLogDock
          babyId={babyId}
          onActivityCreated={addActivityOptimistically}
        />
      )}
    </div>
  );
}

function ActivityGroup({
  title,
  activities,
  onEnd,
}: {
  title: string;
  activities: Activity[];
  onEnd: (id: string) => void;
}) {
  if (!activities.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase">
        {title}
      </h3>

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onEnd={onEnd}
          />
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
