import { differenceInHours, differenceInDays } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";

const CONFIG = {
  expectedIntervalDays: 1,
  toleranceDays: 1,
  minSamples: 3,
  maxGapDays: 7,
};

type InternalInsight = {
  key: string;
  priority: number;
  message: string;
  severity: "info" | "success" | "warning" | "strong";
};

function filterBath(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "bath" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

function computeDayIntervals(acts: Activity[]) {
  const intervals: number[] = [];

  for (let i = 1; i < acts.length; i++) {
    const diff = differenceInDays(
      new Date(acts[i].startTime),
      new Date(acts[i - 1].startTime)
    );

    if (diff > 0 && diff <= CONFIG.maxGapDays) {
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
      createInsight(i.message, i.severity, now, "bath", babyId)
    );
}

export default async function bathProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterBath(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  if (acts.length === 0) {
    return [
      createInsight(
        "No bath data recorded.",
        "info",
        now,
        "bath",
        babyId
      ),
    ];
  }

  const insights: InternalInsight[] = [];

  const last = acts[acts.length - 1];

  const hoursSince = differenceInHours(
    now,
    new Date(last.startTime)
  );

  const daysSince = hoursSince / 24;

  const expected = CONFIG.expectedIntervalDays;
  const upperBound = expected + CONFIG.toleranceDays;

  if (daysSince > upperBound * 1.5) {
    insights.push({
      key: "overdue-critical",
      priority: 100,
      severity: "strong",
      message: `Bath significantly overdue. Last bath was ${Math.floor(
        daysSince
      )} days ago.`,
    });
  } else if (daysSince > upperBound) {
    insights.push({
      key: "overdue-warning",
      priority: 85,
      severity: "warning",
      message: `Bath may be overdue. Last bath was ${Math.floor(
        daysSince
      )} days ago.`,
    });
  }

  const intervals = computeDayIntervals(acts);

  if (intervals.length >= CONFIG.minSamples) {
    const avg =
      intervals.reduce((s, n) => s + n, 0) / intervals.length;

    const avgRounded = Math.round(avg);

    if (avg < expected * 0.5) {
      insights.push({
        key: "too-frequent",
        priority: 60,
        severity: "info",
        message: `Baths are very frequent (~every ${avgRounded} day(s)).`,
      });
    } else if (avg > upperBound) {
      insights.push({
        key: "too-infrequent",
        priority: 75,
        severity: "warning",
        message: `Bath routine is infrequent (~every ${avgRounded} day(s)).`,
      });
    } else {
      insights.push({
        key: "healthy",
        priority: 40,
        severity: "success",
        message: `Bath routine is consistent (~every ${avgRounded} day(s)).`,
      });
    }

    const variance =
      intervals.reduce((s, n) => s + Math.abs(n - avg), 0) /
      intervals.length;

    if (variance > 1) {
      insights.push({
        key: "irregular",
        priority: 70,
        severity: "warning",
        message: "Bath timing is irregular.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      key: "default",
      priority: 10,
      severity: "info",
      message: "No immediate bath concerns detected.",
    });
  }

  return finalizeInsights(insights, now, babyId);
}
