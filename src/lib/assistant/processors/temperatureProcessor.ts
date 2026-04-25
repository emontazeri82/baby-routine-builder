import { differenceInHours } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";

const CONFIG = {
  feverThreshold: 38,
  highFeverThreshold: 39,
  hypothermiaThreshold: 35.5,
  minTrendPoints: 3,
  trackingGapHours: 12,
};

type InternalInsight = {
  key: string;
  priority: number;
  message: string;
  severity: "info" | "success" | "warning" | "strong";
};

function filterTemperature(activities: Activity[]) {
  return activities.filter(
    (a): a is Activity & { value: number; startTime: string | Date } =>
      a.activityType === "temperature" &&
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
      createInsight(i.message, i.severity, now, "temperature", babyId)
    );
}

export default async function temperatureProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterTemperature(activities)]
    .map((a) => ({
      ...a,
      _ts: new Date(a.startTime).getTime(),
    }))
    .sort((a, b) => a._ts - b._ts);

  if (acts.length === 0) {
    return [
      createInsight(
        "No temperature data recorded.",
        "info",
        now,
        "temperature",
        babyId
      ),
    ];
  }

  const insights: InternalInsight[] = [];

  const last = acts[acts.length - 1];
  const temp = last.value;

  if (temp >= CONFIG.highFeverThreshold) {
    insights.push({
      key: "high-fever",
      priority: 100,
      severity: "strong",
      message: `High fever detected (${temp.toFixed(1)}°C). Immediate attention recommended.`,
    });
  } else if (temp >= CONFIG.feverThreshold) {
    insights.push({
      key: "fever",
      priority: 90,
      severity: "warning",
      message: `Fever detected (${temp.toFixed(1)}°C). Monitor closely.`,
    });
  } else if (temp <= CONFIG.hypothermiaThreshold) {
    insights.push({
      key: "low-temp",
      priority: 95,
      severity: "strong",
      message: `Low body temperature detected (${temp.toFixed(1)}°C). Seek attention.`,
    });
  }

  if (acts.length >= CONFIG.minTrendPoints) {
    const recent = acts.slice(-CONFIG.minTrendPoints).map((a) => a.value);

    const first = recent[0];
    const lastVal = recent[recent.length - 1];

    const delta = lastVal - first;

    if (delta >= 0.5) {
      insights.push({
        key: "rising-temp",
        priority: 85,
        severity: "warning",
        message: "Temperature is rising across recent readings.",
      });
    } else if (delta <= -0.5) {
      insights.push({
        key: "falling-temp",
        priority: 40,
        severity: "success",
        message: "Temperature is decreasing toward normal.",
      });
    }
  }

  if (
    temp > 36 &&
    temp < CONFIG.feverThreshold &&
    insights.length === 0
  ) {
    insights.push({
      key: "normal-temp",
      priority: 20,
      severity: "success",
      message: `Normal body temperature (${temp.toFixed(1)}°C).`,
    });
  }

  const hoursSince = differenceInHours(now, new Date(last.startTime));

  if (hoursSince > CONFIG.trackingGapHours) {
    insights.push({
      key: "temp-gap",
      priority: 50,
      severity: "info",
      message: "No recent temperature readings. Consider updating data.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "neutral",
      priority: 10,
      severity: "info",
      message: "No temperature concerns detected.",
    });
  }

  return finalizeInsights(insights, now, babyId);
}
