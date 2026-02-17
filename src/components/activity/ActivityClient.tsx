"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isThisWeek } from "date-fns";
import { Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Activity = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  notes: string | null;
  babyId: string;
  babyName: string | null;
  activityName: string | null;
};

export default function ActivityClient({
  activities,
  babies,
}: {
  activities: Activity[];
  babies: any[];
}) {
  const [timeFilter, setTimeFilter] = useState("all");
  const [babyFilter, setBabyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");

  const filteredActivities = useMemo(() => {
    let result = [...activities];

    // Time filter
    if (timeFilter === "today") {
      result = result.filter((a) =>
        a.startTime ? isToday(new Date(a.startTime)) : false
      );
    }

    if (timeFilter === "week") {
      result = result.filter((a) =>
        a.startTime ? isThisWeek(new Date(a.startTime)) : false
      );
    }

    // Baby filter
    if (babyFilter !== "all") {
      result = result.filter((a) => a.babyId === babyFilter);
    }

    // Search
    if (search.trim()) {
      result = result.filter((a) =>
        a.activityName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sorting
    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          (b.startTime?.getTime() || 0) -
          (a.startTime?.getTime() || 0)
      );
    }

    if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          (a.startTime?.getTime() || 0) -
          (b.startTime?.getTime() || 0)
      );
    }

    return result;
  }, [activities, timeFilter, babyFilter, sortBy, search]);

  const totalToday = activities.filter((a) =>
    a.startTime ? isToday(new Date(a.startTime)) : false
  ).length;

  return (
    <div className="p-8 space-y-8 relative">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Activities</h1>
        <p className="text-neutral-500">
          Track your baby's daily routine
        </p>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Activities" value={activities.length} />
        <StatCard title="Today" value={totalToday} />
        <StatCard title="Babies" value={babies.length} />
      </div>

      {/* FILTER BAR */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Time Buttons */}
        <div className="flex gap-2">
          <Button
            variant={timeFilter === "all" ? "default" : "outline"}
            onClick={() => setTimeFilter("all")}
          >
            All
          </Button>
          <Button
            variant={timeFilter === "today" ? "default" : "outline"}
            onClick={() => setTimeFilter("today")}
          >
            Today
          </Button>
          <Button
            variant={timeFilter === "week" ? "default" : "outline"}
            onClick={() => setTimeFilter("week")}
          >
            This Week
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-60">
          <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Baby Select */}
        <div className="w-48">
          <Select
            value={babyFilter}
            onChange={setBabyFilter}
            options={[
              { label: "All Babies", value: "all" },
              ...babies.map((baby: any) => ({
                label: baby.name,
                value: baby.id,
              })),
            ]}
          />
        </div>

        {/* Sort Select */}
        <div className="w-40">
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: "Newest", value: "newest" },
              { label: "Oldest", value: "oldest" },
            ]}
          />
        </div>
      </Card>

      {/* TIMELINE */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredActivities.length === 0 && <EmptyState />}

          {filteredActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              layout
            >
              <Card className="p-4 flex justify-between items-center hover:shadow-md transition">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {activity.activityName || "Activity"}
                    </h3>
                    {activity.babyName && (
                      <Badge>{activity.babyName}</Badge>
                    )}
                  </div>

                  <p className="text-sm text-neutral-500">
                    {activity.startTime &&
                      format(
                        new Date(activity.startTime),
                        "PPP p"
                      )}
                  </p>

                  {activity.notes && (
                    <p className="text-sm mt-2 text-neutral-700">
                      {activity.notes}
                    </p>
                  )}
                </div>

                <Button variant="outline">
                  View
                </Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Add Button */}
      <motion.div
        className="fixed bottom-8 right-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Button className="rounded-full shadow-lg">
          + Add Activity
        </Button>
      </motion.div>
    </div>
  );
}

/* ---------- Components ---------- */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <Card className="p-6">
        <p className="text-sm text-neutral-500">
          {title}
        </p>
        <p className="text-2xl font-bold mt-2">
          {value}
        </p>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16 text-neutral-500"
    >
      No activities found.
    </motion.div>
  );
}
