import { differenceInMinutes } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { formatDuration } from "../assistant.utils";
import { createInsight } from "./processorUtils";

function diaperActs(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "diaper" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

export default async function diaperProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...diaperActs(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (!acts.length) {
    return [
      createInsight(
        "No diaper data. No diaper activity logged.",
        "info",
        now,
        "diaper",
        babyId
      ),
    ];
  }

  const last = acts[acts.length - 1];
  const minutesSince = differenceInMinutes(now, new Date(last.startTime));
  const out: InsightResult[] = [];

  if (minutesSince > 240) {
    out.push(
      createInsight(
        `Long time since last diaper. ${formatDuration(minutesSince)} since last change.`,
        "strong",
        now,
        "diaper",
        babyId
      )
    );
  }

  const today = now.toDateString();
  const todayCount = acts.filter(
    (a) => new Date(a.startTime).toDateString() === today
  ).length;

  if (todayCount > 0 && todayCount < 4) {
    out.push(
      createInsight(
        "Low diaper frequency. Fewer diaper changes than expected today.",
        "warning",
        now,
        "diaper",
        babyId
      )
    );
  }

  return out;
}
