"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Flame,
} from "lucide-react";
import type { DashboardInsight } from "@/lib/insights/types";

/* =========================
   HELPERS
========================= */

const severityOrder: Record<string, number> = {
  critical: 5,
  strong: 4,
  warning: 3,
  info: 2,
  success: 1,
};

/** Top 5 by engine severity, then score, stable id tiebreak. */
function processInsights(insights: DashboardInsight[]) {
  const list = insights || [];
  if (list.length === 0) return [];

  return [...list]
    .sort((a, b) => {
      const s =
        (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
      if (s !== 0) return s;
      const byScore = (b.score || 0) - (a.score || 0);
      if (byScore !== 0) return byScore;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 5);
}

/* =========================
   COMPONENT
========================= */

export default function DashboardInsights({
  insights,
}: {
  insights: DashboardInsight[];
}) {
  const finalInsights = processInsights(insights || []);

  if (!finalInsights.length) {
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
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neutral-700" />
          <h2 className="text-lg font-semibold">
            Smart Insights
          </h2>
        </div>

        {/* Insights */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.08 },
            },
          }}
          className="space-y-3"
        >
          <AnimatePresence>
            {finalInsights.map((insight) => (
              <InsightItem
                key={insight.id}
                insight={insight}
              />
            ))}
          </AnimatePresence>
        </motion.div>
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
      "border-red-400 bg-red-50 text-red-800 shadow-md",
    strong:
      "border-red-300 bg-red-50 text-red-800",
    warning:
      "border-yellow-300 bg-yellow-50 text-yellow-800",
    success:
      "border-green-300 bg-green-50 text-green-800",
    info:
      "border-blue-300 bg-blue-50 text-blue-800",
  };

  const iconMap = {
    critical: <Flame className="w-4 h-4" />,
    strong: <AlertTriangle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ scale: 1.02 }}
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

        {insight.actionLabel &&
          insight.actionUrl && (
            <a
              href={insight.actionUrl}
              className="text-xs underline mt-2 inline-block"
            >
              {insight.actionLabel}
            </a>
          )}
      </div>
    </motion.div>
  );
}
