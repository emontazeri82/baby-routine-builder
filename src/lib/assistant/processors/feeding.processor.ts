import { differenceInMinutes } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { formatDuration } from "../assistant.utils";
import { createInsight } from "./processorUtils";

const MIN_POINTS = 3;
const EXPECT_MIN = 120;
const EXPECT_MAX = 240;
const IRREGULAR = 60;

function filterFeeding(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "feeding" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

export default async function feedingProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...filterFeeding(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (acts.length === 0) {
    return [
      createInsight(
        "No feeding data. No feeding activity logged.",
        "info",
        now,
        "feeding",
        babyId
      ),
    ];
  }

  const intervals: number[] = [];
  for (let i = 1; i < acts.length; i++) {
    const diff = differenceInMinutes(
      new Date(acts[i].startTime),
      new Date(acts[i - 1].startTime)
    );
    if (diff > 0 && diff < 1000) intervals.push(diff);
  }

  const last = acts[acts.length - 1];
  const minutesSince = differenceInMinutes(now, new Date(last.startTime));
  const out: InsightResult[] = [];

  if (minutesSince > EXPECT_MAX) {
    out.push(
      createInsight(
        `Feeding overdue. Last feeding was ${formatDuration(minutesSince)} ago.`,
        "strong",
        now,
        "feeding",
        babyId
      )
    );
  }

  if (intervals.length >= MIN_POINTS) {
    const avg = intervals.reduce((s, n) => s + n, 0) / intervals.length;
    if (avg < EXPECT_MIN) {
      out.push(
        createInsight(
          `Frequent feeding pattern. Feedings every ~${formatDuration(Math.round(avg))}.`,
          "info",
          now,
          "feeding",
          babyId
        )
      );
    } else if (avg > EXPECT_MAX) {
      out.push(
        createInsight(
          `Long feeding intervals. Feedings every ~${formatDuration(Math.round(avg))}.`,
          "warning",
          now,
          "feeding",
          babyId
        )
      );
    } else {
      out.push(
        createInsight(
          `Healthy feeding rhythm. Average interval: ${formatDuration(Math.round(avg))}.`,
          "success",
          now,
          "feeding",
          babyId
        )
      );
    }

    const variance =
      intervals.reduce((s, n) => s + Math.abs(n - avg), 0) / intervals.length;
    if (variance > IRREGULAR) {
      out.push(
        createInsight(
          "Irregular feeding pattern. Feeding times are inconsistent.",
          "warning",
          now,
          "feeding",
          babyId
        )
      );
    }
  }

  return out;
}
