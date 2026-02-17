"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { isAfter } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import ReminderCard from "./ReminderCard";

type Reminder = {
  id: string;
  title: string | null;
  nextRun: Date | null;
  isActive: boolean | null;
  babyId: string;
};

type Baby = {
  id: string;
  name: string;
};

export default function ReminderClient({
  reminders,
  babies,
}: {
  reminders: Reminder[];
  babies: Baby[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [babyFilter, setBabyFilter] = useState("all");

  const filtered = useMemo(() => {
    return reminders.filter((r) => {
      if (babyFilter !== "all" && r.babyId !== babyFilter)
        return false;

      if (statusFilter === "active" && !r.isActive)
        return false;

      if (statusFilter === "scheduled" && r.nextRun && !isAfter(r.nextRun, new Date()))
        return false;

      if (statusFilter === "past" && r.nextRun && isAfter(r.nextRun, new Date()))
        return false;

      return true;
    });
  }, [reminders, statusFilter, babyFilter]);

  const activeCount = reminders.filter(r => r.isActive).length;

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">
          Reminders
        </h1>
        <p className="text-neutral-500">
          Stay ahead of your baby's routine
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Reminders" value={reminders.length} />
        <StatCard title="Active" value={activeCount} />
        <StatCard title="Babies" value={babies.length} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-4">

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Past", value: "past" },
            ]}
          />

          <Select
            value={babyFilter}
            onChange={setBabyFilter}
            options={[
              { label: "All Babies", value: "all" },
              ...babies.map(b => ({
                label: b.name,
                value: b.id,
              })),
            ]}
          />

        </div>

        <Button>Add Reminder</Button>
      </div>

      {/* Reminder List */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <EmptyState />
        )}

        {filtered.map((reminder) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ReminderCard reminder={reminder} />
          </motion.div>
        ))}
      </div>

    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-6">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-neutral-500">
      No reminders found.
    </div>
  );
}
