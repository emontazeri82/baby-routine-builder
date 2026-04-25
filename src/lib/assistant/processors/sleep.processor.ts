import { differenceInMinutes } from "date-fns";
import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { formatDuration } from "../assistant.utils";
import { createInsight } from "./processorUtils";

function sleepActs(activities: Activity[]) {
  return activities.filter(
    (a) =>
      a.activityType === "sleep" &&
      a.startTime &&
      !Number.isNaN(new Date(a.startTime).getTime())
  );
}

export default async function sleepProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = [...sleepActs(activities)].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (!acts.length) {
    return [
      createInsight(
        "No sleep data. No sleep logged yet.",
        "info",
        now,
        "sleep",
        babyId
      ),
    ];
  }

  const last = acts[acts.length - 1];
  const start = new Date(last.startTime);
  const end = last.endTime ? new Date(last.endTime) : now;
  const duration = Math.max(
    0,
    differenceInMinutes(end instanceof Date ? end : now, start)
  );

  const out: InsightResult[] = [];

  if (duration > 0 && duration < 45) {
    out.push(
      createInsight(
        `Short sleep detected. Last sleep only ${formatDuration(duration)}.`,
        "warning",
        now,
        "sleep",
        babyId
      )
    );
  } else if (duration >= 45) {
    out.push(
      createInsight(
        `Great sleep. Last sleep was ${formatDuration(duration)}.`,
        "success",
        now,
        "sleep",
        babyId
      )
    );
  }

  const awakeSince = last.endTime
    ? differenceInMinutes(now, new Date(last.endTime))
    : differenceInMinutes(now, start);

  if (awakeSince > 240) {
    out.push(
      createInsight(
        `Baby may be overtired. ${formatDuration(awakeSince)} awake.`,
        "strong",
        now,
        "sleep",
        babyId
      )
    );
  }

  return out;
}
