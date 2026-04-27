"use client";

import { useMemo } from "react";
import SmartInsightCard, { Insight } from "./SmartInsightCard";
import {
  generateActivityInsights,
  ScoredInsight,
  Activity,
  GlobalInsight,
} from "@/lib/insights/activityInsights";

type ActivityInsightsProps = {
  activities: Activity[];
  globalInsights?: GlobalInsight[];
};

function mapToUIInsight(insight: ScoredInsight): Insight {
  return {
    title: insight.title,
    description: insight.description,
    severity: insight.severity,
    type: "system",
  };
}

export default function ActivityInsights({
  activities,
  globalInsights = [],
}: ActivityInsightsProps) {
  const insights = useMemo(() => {
    try {
      return generateActivityInsights({ activities, globalInsights });
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("[ActivityInsights] generateActivityInsights failed:", e);
      }
      return [];
    }
  }, [activities, globalInsights]);

  if (!insights.length) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <SmartInsightCard
          key={insight.id}
          insight={mapToUIInsight(insight)}
        />
      ))}
    </div>
  );
}