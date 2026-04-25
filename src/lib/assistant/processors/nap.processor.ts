import { differenceInMinutes } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { formatDuration } from "../assistant.utils";
import { createInsight } from "./processorUtils";

function napActs(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "nap" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

export default async function napProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...napActs(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (!acts.length) return [];

  const last = acts[acts.length - 1];
  const start = new Date(last.startTime);
  const end = last.endTime ? new Date(last.endTime) : now;
  const duration = Math.max(
    0,
    differenceInMinutes(end instanceof Date ? end : now, start)
  );

  const out: InsightResult[] = [];

  if (duration > 0 && duration < 35) {
    out.push(
      createInsight(
        `Short nap detected. Nap lasted only ${formatDuration(duration)}.`,
        "warning",
        now,
        "nap",
        babyId
      )
    );
  } else if (duration >= 35) {
    out.push(
      createInsight(
        `Good nap. Nap lasted ${formatDuration(duration)}.`,
        "success",
        now,
        "nap",
        babyId
      )
    );
  }

  const awake =
    last.endTime != null
      ? differenceInMinutes(now, new Date(last.endTime))
      : differenceInMinutes(now, start);

  if (awake > 180) {
    out.push(
      createInsight(
        `Nap overdue. ${formatDuration(awake)} awake.`,
        "strong",
        now,
        "nap",
        babyId
      )
    );
  }

  return out;
}
