// /lib/assistant/drawerAnalysis/recommendations.ts

import type { DeviationResult } from "./deviation";
import type { TrendResult } from "./trend";
import type { MissedResult } from "./missed";
import type { ConsistencyResult } from "./consistency";

export type Recommendation = {
  id: string;
  priority: number;
  message: string;
};

export type RecommendationInput = {
  deviation: DeviationResult;
  trend: TrendResult;
  missed: MissedResult;
  consistency: ConsistencyResult;
};

export function buildRecommendations(
  input: RecommendationInput
): Recommendation[] {
  const { deviation, trend, missed, consistency } = input;

  const list: Recommendation[] = [];

  if (missed.isMissed && missed.severity === "critical") {
    list.push({
      id: "missed-critical",
      priority: 100,
      message:
        "Log this activity now — it appears to have been missed",
    });
  }

  if (missed.isMissed && missed.severity === "warning") {
    list.push({
      id: "missed-warning",
      priority: 90,
      message:
        "This activity may be overdue — consider doing it soon",
    });
  }

  if (deviation.isValid && deviation.deviationPercent !== null) {
    if (deviation.deviationPercent > 30) {
      list.push({
        id: "late-deviation",
        priority: 80,
        message:
          "Timing is drifting later — try performing this activity earlier",
      });
    }

    if (deviation.deviationPercent < -30) {
      list.push({
        id: "early-deviation",
        priority: 60,
        message:
          "Activity is happening earlier than usual — monitor for pattern shifts",
      });
    }
  }

  if (trend.isValid && trend.direction === "up") {
    list.push({
      id: "trend-up",
      priority: 70,
      message:
        "Intervals are increasing — routine may be drifting later",
    });
  }

  if (trend.isValid && trend.direction === "down") {
    list.push({
      id: "trend-down",
      priority: 50,
      message:
        "Intervals are tightening — routine becoming more consistent",
    });
  }

  if (consistency.isValid && consistency.score !== null) {
    if (consistency.score < 40) {
      list.push({
        id: "low-consistency",
        priority: 75,
        message: "Routine is irregular — consider stabilizing timing",
      });
    } else if (consistency.score > 80) {
      list.push({
        id: "high-consistency",
        priority: 30,
        message: "Routine is very consistent — keep it up",
      });
    }
  }

  if (list.length === 0) {
    list.push({
      id: "default",
      priority: 10,
      message:
        "No immediate action needed — continue your current routine",
    });
  }

  return list.sort((a, b) => b.priority - a.priority);
}
