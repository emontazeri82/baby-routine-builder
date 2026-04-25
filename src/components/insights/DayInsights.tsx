"use client";

import { useMemo } from "react";
import SmartInsightCard from "./SmartInsightCard";
import { generateDayInsights } from "@/lib/insights/dayInsights";
import { UIInsight } from "@/lib/insights/types";
import { Card } from "@/components/ui/card";
import { TimelineEvent, DailySummaryStats } from "@/lib/insights/types";

type DayInsightsProps = {
  timeline: TimelineEvent[];
  stats: DailySummaryStats;
  date?: Date;

  // 🔥 future interaction hook
  onInsightAction?: (insight: UIInsight) => void;
};

export default function DayInsights({
  timeline,
  stats,
  date,
  onInsightAction,
}: DayInsightsProps) {
  // =========================
  // 🧠 Generate insights
  // =========================
  const insights: UIInsight[] = useMemo(() => {
    if (!timeline || !stats) return [];

    return generateDayInsights({
      timeline,
      stats,
      date,
    });
  }, [timeline, stats, date]);

  // =========================
  // 🧠 Categorize insights
  // =========================
  const { summary, critical, warnings, positive, info } = useMemo(() => {
    const nonSummary = insights.filter(i => i.type !== "summary");

    const summary = insights.find((i) => i.type === "summary");

    const critical = nonSummary.filter((i) => i.severity === "strong");
    const warnings = nonSummary.filter((i) => i.severity === "warning");
    const positive = nonSummary.filter((i) => i.severity === "success");
    const info = nonSummary.filter((i) => i.severity === "info");

    return { summary, critical, warnings, positive, info };
  }, [insights]);

  // =========================
  // 🎯 Enhance actions
  // =========================
  const enhanceInsight = (insight: UIInsight): UIInsight => {
    if (!onInsightAction) return insight;

    return {
      ...insight,
      onAction: () => {
        onInsightAction?.(insight); // track first
        insight.onAction?.();       // then execute
      }
    };
  };

  // =========================
  // 🚫 Empty state
  // =========================
  const nonSummaryInsights = insights.filter(i => i.type !== "summary");

  if (!nonSummaryInsights.length) {
    return (
      <Card className="p-6 text-sm text-neutral-500">
        No significant insights for this day.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* =========================
          🧠 Smart Summary
      ========================= */}
      {summary && (
        <Card className="p-5 bg-blue-50 border-blue-200">
          <div className="text-sm font-medium text-blue-900">
            🧠 {summary.title}
          </div>
        </Card>
      )}

      {/* =========================
          🔴 Critical / Needs Attention
      ========================= */}
      {critical.length > 0 && (
        <Card className="p-5 border-red-200 bg-red-50/40">
          <h3 className="text-sm font-semibold mb-3 text-red-700">
            🚨 Needs Attention
          </h3>

          <div className="space-y-3">
            {critical.map((insight, i) => (
              <SmartInsightCard
                key={insight.id ?? `critical-${i}`}
                insight={enhanceInsight(insight)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* =========================
          🟡 Warnings
      ========================= */}
      {warnings.length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/40">
          <h3 className="text-sm font-semibold mb-3 text-amber-700">
            ⚠️ Watch Out
          </h3>

          <div className="space-y-3">
            {warnings.map((insight, i) => (
              <SmartInsightCard
                key={insight.id ?? `warning-${i}`}
                insight={enhanceInsight(insight)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* =========================
          🟢 Positive Signals
      ========================= */}
      {positive.length > 0 && (
        <Card className="p-5 border-green-200 bg-green-50/40">
          <h3 className="text-sm font-semibold mb-3 text-green-700">
            ✅ What’s Going Well
          </h3>

          <div className="space-y-3">
            {positive.map((insight, i) => (
              <SmartInsightCard
                key={insight.id ?? `success-${i}`}
                insight={enhanceInsight(insight)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* =========================
          💡 General Insights
      ========================= */}
      {info.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3 text-neutral-700">
            💡 Insights
          </h3>

          <div className="space-y-3">
            {info.map((insight, i) => (
              <SmartInsightCard
                key={insight.id ?? `info-${i}`}
                insight={enhanceInsight(insight)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}