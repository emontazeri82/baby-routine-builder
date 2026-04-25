import { differenceInDays } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";

const CONFIG = {
  minSamples: 3,
  minDaysSpan: 5,
  stagnationThreshold: 0,
  dropThreshold: -0.02,
  slowGrowthThreshold: 0.02,
  trackingGapDays: 7,
};

type InternalInsight = {
  key: string;
  priority: number;
  message: string;
  severity: "info" | "success" | "warning" | "strong";
};

function filterGrowth(activities: Activity[]) {
  return activities.filter(
    (a): a is Activity & { value: number; startTime: string | Date } =>
      a.activityType === "growth" &&
      typeof a.value === "number" &&
      !!a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

function finalizeInsights(
  list: InternalInsight[],
  now: Date,
  babyId?: string
): InsightResult[] {
  const map = new Map<string, InternalInsight>();

  for (const item of list) {
    const existing = map.get(item.key);
    if (!existing || item.priority > existing.priority) {
      map.set(item.key, item);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.priority - a.priority)
    .map((i) =>
      createInsight(i.message, i.severity, now, "growth", babyId)
    );
}

export default async function growthProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterGrowth(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  if (acts.length === 0) {
    return [
      createInsight(
        "No growth data recorded.",
        "info",
        now,
        "growth",
        babyId
      ),
    ];
  }

  const insights: InternalInsight[] = [];

  const first = acts[0];
  const last = acts[acts.length - 1];

  const firstValue = first.value;
  const lastValue = last.value;
  if (firstValue <= 0) {
    return finalizeInsights(
      [{
        key: "invalid-baseline",
        priority: 30,
        severity: "info",
        message: "Invalid baseline growth value.",
      }],
      now,
      babyId
    );
  }

  const daysSpan = differenceInDays(
    new Date(last.startTime),
    new Date(first.startTime)
  );

  if (acts.length < CONFIG.minSamples || daysSpan < CONFIG.minDaysSpan) {
    insights.push({
      key: "insufficient-data",
      priority: 20,
      severity: "info",
      message: "Not enough growth data to determine a trend yet.",
    });

    return finalizeInsights(insights, now, babyId);
  }

  const changeRatio = (lastValue - firstValue) / firstValue;
  const EPSILON = 0.01;
  const percent = Math.round(changeRatio * 100);
  const absPercent = Math.abs(percent);

  if (changeRatio <= CONFIG.dropThreshold) {
    insights.push({
      key: "growth-drop",
      priority: 100,
      severity: "strong",
      message: `Growth decrease detected (${absPercent}%). Review measurements or consult a professional.`,
    });
  } else if (changeRatio <= EPSILON) {
    insights.push({
      key: "growth-stagnation",
      priority: 85,
      severity: "warning",
      message: `Growth appears stagnant (minimal change over ${daysSpan} days).`,
    });
  } else if (changeRatio < CONFIG.slowGrowthThreshold) {
    insights.push({
      key: "slow-growth",
      priority: 70,
      severity: "warning",
      message: `Growth is progressing slowly (+${percent}% over ${daysSpan} days). Monitor future measurements.`,
    });
  } else {
    insights.push({
      key: "growth-positive",
      priority: 50,
      severity: "success",
      message: `Healthy growth trend (+${percent}% over ${daysSpan} days).`,
    });
  }

  const lastMeasurementDays = differenceInDays(
    now,
    new Date(last.startTime)
  );

  if (lastMeasurementDays > CONFIG.trackingGapDays) {
    insights.push({
      key: "tracking-gap",
      priority: 60,
      severity: "warning",
      message: "Growth measurements are not recent. Consider updating data.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "growth-neutral",
      priority: 10,
      severity: "info",
      message: "No significant growth changes detected.",
    });
  }

  return finalizeInsights(insights, now, babyId);
}
