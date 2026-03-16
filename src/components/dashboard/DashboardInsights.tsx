"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";

/* =========================
   TYPES
========================= */

export type InsightSeverity =
  | "success"
  | "info"
  | "warning"
  | "critical";

export interface DashboardInsight {
  id: string;
  category:
    | "feeding"
    | "sleep"
    | "growth"
    | "reminder"
    | "diaper"
    | "play"
    | "bath"
    | "medicine"
    | "temperature"
    | "nap";
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface DashboardInsightsProps {
  insights: DashboardInsight[];
}

/* =========================
   COMPONENT
========================= */

export default function DashboardInsights({
  insights,
}: DashboardInsightsProps) {
  if (!insights || insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-br from-white to-neutral-50 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-semibold">
              Smart Insights
            </h2>
          </div>

          <p className="text-sm text-neutral-600">
            Everything looks calm and balanced today.
          </p>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="p-6 bg-gradient-to-br from-white to-neutral-50 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neutral-700" />
          <h2 className="text-lg font-semibold">
            Smart Insights
          </h2>
        </div>

        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightItem key={insight.id} insight={insight} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

/* =========================
   INSIGHT ITEM
========================= */

function InsightItem({
  insight,
}: {
  insight: DashboardInsight;
}) {
  const severityStyles = {
    critical:
      "border-red-300 bg-red-50 text-red-800",
    warning:
      "border-yellow-300 bg-yellow-50 text-yellow-800",
    success:
      "border-green-300 bg-green-50 text-green-800",
    info:
      "border-blue-300 bg-blue-50 text-blue-800",
  };

  const iconMap = {
    critical: (
      <AlertTriangle className="w-4 h-4" />
    ),
    warning: (
      <AlertTriangle className="w-4 h-4" />
    ),
    success: (
      <CheckCircle2 className="w-4 h-4" />
    ),
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div
      className={`p-4 rounded-lg border flex items-start gap-3 ${
        severityStyles[insight.severity]
      }`}
    >
      <div className="mt-1">
        {iconMap[insight.severity]}
      </div>

      <div className="flex-1">
        <p className="font-semibold text-sm">
          {insight.title}
        </p>
        <p className="text-xs opacity-80 mt-1">
          {insight.message}
        </p>

        {insight.actionLabel && insight.actionUrl && (
          <a
            href={insight.actionUrl}
            className="text-xs underline mt-2 inline-block"
          >
            {insight.actionLabel}
          </a>
        )}
      </div>
    </div>
  );
}
