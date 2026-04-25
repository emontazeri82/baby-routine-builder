import { differenceInMinutes } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";
import { formatDuration } from "../assistant.utils";

const CONFIG = {
  expectedInterval: 240,
  tolerance: 0.25,
  minSamples: 3,
  maxIntervalCap: 1440,
};

type InternalInsight = {
  key: string;
  priority: number;
  message: string;
  severity: "info" | "success" | "warning" | "strong";
};

function filterMedicine(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "medicine" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

function computeIntervals(acts: Activity[]) {
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
      createInsight(i.message, i.severity, now, "medicine", babyId)
    );
}

export default async function medicineProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterMedicine(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  if (acts.length === 0) {
    return [
      createInsight(
        "No medication data. No doses recorded.",
        "info",
        now,
        "medicine",
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

  const intervals = computeIntervals(acts);

  const expected = CONFIG.expectedInterval;
  const upperBound = expected * (1 + CONFIG.tolerance);
  const lowerBound = expected * (1 - CONFIG.tolerance);

  if (minutesSince > upperBound * 1.5) {
    insights.push({
      key: "missed-critical",
      priority: 100,
      severity: "strong",
      message: `Medication likely missed. Last dose was ${formatDuration(
        minutesSince
      )} ago.`,
    });
  } else if (minutesSince > upperBound) {
    insights.push({
      key: "missed-warning",
      priority: 90,
      severity: "warning",
      message: `Medication overdue. Last dose was ${formatDuration(
        minutesSince
      )} ago.`,
    });
  }

  if (intervals.length >= CONFIG.minSamples) {
    const avg =
      intervals.reduce((s, n) => s + n, 0) / intervals.length;

    const avgRounded = Math.round(avg);

    if (avg < lowerBound) {
      insights.push({
        key: "too-frequent",
        priority: 70,
        severity: "info",
        message: `Medication given frequently (~${formatDuration(
          avgRounded
        )} intervals).`,
      });
    } else if (avg > upperBound) {
      insights.push({
        key: "too-infrequent",
        priority: 80,
        severity: "warning",
        message: `Medication spacing is inconsistent (~${formatDuration(
          avgRounded
        )} intervals).`,
      });
    } else {
      insights.push({
        key: "healthy",
        priority: 40,
        severity: "success",
        message: `Medication timing is consistent (~${formatDuration(
          avgRounded
        )} intervals).`,
      });
    }

    const variance =
      intervals.reduce((s, n) => s + Math.abs(n - avg), 0) /
      intervals.length;

    if (variance > expected * 0.3) {
      insights.push({
        key: "irregular",
        priority: 75,
        severity: "warning",
        message:
          "Medication schedule is irregular. Timing varies significantly.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      key: "default",
      priority: 10,
      severity: "info",
      message: "No immediate medication concerns detected.",
    });
  }

  return finalizeInsights(insights, now, babyId);
}
