"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface DashboardStatsProps {
  babiesCount: number;
  todayCount: number;
  remindersCount: number;
}

export default function DashboardStats({
  babiesCount,
  todayCount,
  remindersCount,
}: DashboardStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      <StatCard title="Babies" value={babiesCount} />
      <StatCard title="Today’s Activities" value={todayCount} />
      <StatCard title="Active Reminders" value={remindersCount} />
    </motion.div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <Card className="p-6 shadow-sm hover:shadow-md transition">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Card>
  );
}
