"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface DashboardInsightsProps {
  babiesCount: number;
  todayCount: number;
  remindersCount: number;
}

export default function DashboardInsights({
  babiesCount,
  todayCount,
  remindersCount,
}: DashboardInsightsProps) {
  const activityLoadScore =
    todayCount + remindersCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-6 bg-gradient-to-br from-white to-neutral-50 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          <h2 className="text-lg font-semibold">
            Smart Insights
          </h2>
        </div>

        <p className="text-sm text-neutral-600">
          {babiesCount === 0
            ? "Start by adding your baby profile."
            : activityLoadScore > 10
            ? "Busy day! You have many activities scheduled."
            : "Your schedule looks balanced today."}
        </p>
      </Card>
    </motion.div>
  );
}
