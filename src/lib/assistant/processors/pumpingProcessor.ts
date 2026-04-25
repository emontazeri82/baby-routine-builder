import { differenceInMinutes } from "date-fns";
import type { Activity as InsightActivity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";
import { formatDuration } from "../assistant.utils";

/**
 * Config — tuned for pumping patterns
 */
const CONFIG = {
  minSamples: 3,
  expectedIntervalMin: 120,   // 2h
  expectedIntervalMax: 300,   // 5h
  maxIntervalCap: 1440,       // ignore > 24h
  irregularThreshold: 60,     // minutes
  lowOutputThreshold: 30,     // ml (or normalized units)
  highOutputThreshold: 150,   // ml
};

type InternalInsight = {
  key: string;
  priority: number;
  message: string;
  severity: "info" | "success" | "warning" | "strong";
};

function filterPumping(activities: InsightActivity[]) {
  return activities.filter(
    (a): a is InsightActivity & { startTime: string | Date; value?: number } =>
      a.activityType === "pumping" &&
      !!a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

function getAmount(a: InsightActivity): number | null {
  if (typeof a.value === "number") return a.value;
  if (typeof a.metadata?.amountMl === "number") return a.metadata.amountMl;
  if (typeof a.metadata?.amount === "number") return a.metadata.amount;
  return null;
}

function computeIntervals(
  acts: (InsightActivity & { startTime: string | Date })[]
) {
  const intervals: number[] = [];

  for (let i = 1; i < acts.length; i++) {
    const diff = differenceInMinutes(
      new Date(acts[i].startTime),
      new Date(acts[i - 1].startTime)
    );

    if (diff > 0 && diff < CONFIG.maxIntervalCap) {
      intervals.push(diff);
    }
  }

  return intervals;
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
      createInsight(i.message, i.severity, now, "pumping", babyId)
    );
}

export default async function pumpingProcessor(
  activities: InsightActivity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterPumping(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  if (acts.length === 0) {
    return [
      createInsight(
        "No pumping data recorded.",
        "info",
        now,
        "pumping",
        babyId
      ),
    ];
  }

  const insights: InternalInsight[] = [];

  const last = acts[acts.length - 1];
  const minutesSince = differenceInMinutes(
    now,
    new Date(last.startTime)
  );

  // -----------------------------------
  // 1. Overdue pumping
  // -----------------------------------
  if (minutesSince > CONFIG.expectedIntervalMax * 1.5) {
    insights.push({
      key: "overdue-critical",
      priority: 100,
      severity: "strong",
      message: `Pumping likely overdue. Last session was ${formatDuration(minutesSince)} ago.`,
    });
  } else if (minutesSince > CONFIG.expectedIntervalMax) {
    insights.push({
      key: "overdue-warning",
      priority: 85,
      severity: "warning",
      message: `Pumping may be overdue. Last session was ${formatDuration(minutesSince)} ago.`,
    });
  }

  // -----------------------------------
  // 2. Output analysis
  // -----------------------------------
  const outputs = acts
    .map(getAmount)
    .filter((n): n is number => typeof n === "number" && n > 0);

  if (outputs.length >= CONFIG.minSamples) {
    const avg =
      outputs.reduce((s, n) => s + n, 0) / outputs.length;

    const avgRounded = Math.round(avg);

    if (avg < CONFIG.lowOutputThreshold) {
      insights.push({
        key: "low-output",
        priority: 80,
        severity: "warning",
        message: `Low pumping output (~${avgRounded} ml average).`,
      });
    } else if (avg > CONFIG.highOutputThreshold) {
      insights.push({
        key: "high-output",
        priority: 40,
        severity: "success",
        message: `Strong pumping output (~${avgRounded} ml average).`,
      });
    } else {
      insights.push({
        key: "normal-output",
        priority: 30,
        severity: "info",
        message: `Moderate pumping output (~${avgRounded} ml average).`,
      });
    }
  }

  // -----------------------------------
  // 3. Interval pattern
  // -----------------------------------
  const intervals = computeIntervals(acts);

  if (intervals.length >= CONFIG.minSamples) {
    const avg =
      intervals.reduce((s, n) => s + n, 0) / intervals.length;

    const avgRounded = Math.round(avg);

    if (avg > CONFIG.expectedIntervalMax) {
      insights.push({
        key: "infrequent",
        priority: 75,
        severity: "warning",
        message: `Pumping intervals are long (~${formatDuration(avgRounded)}).`,
      });
    } else if (avg < CONFIG.expectedIntervalMin) {
      insights.push({
        key: "frequent",
        priority: 50,
        severity: "info",
        message: `Frequent pumping (~${formatDuration(avgRounded)} intervals).`,
      });
    } else {
      insights.push({
        key: "consistent",
        priority: 35,
        severity: "success",
        message: `Pumping schedule is consistent (~${formatDuration(avgRounded)} intervals).`,
      });
    }

    // -----------------------------------
    // 4. Irregularity
    // -----------------------------------
    const variance =
      intervals.reduce((s, n) => s + Math.abs(n - avg), 0) /
      intervals.length;

    if (variance > CONFIG.irregularThreshold) {
      insights.push({
        key: "irregular",
        priority: 70,
        severity: "warning",
        message: "Pumping schedule is irregular.",
      });
    }
  }

  // -----------------------------------
  // 5. Fallback
  // -----------------------------------
  if (insights.length === 0) {
    insights.push({
      key: "neutral",
      priority: 10,
      severity: "info",
      message: "No immediate pumping concerns detected.",
    });
  }

  return finalizeInsights(insights, now, babyId);
}