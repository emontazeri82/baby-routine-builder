import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";

function countType(activities: Activity[], t: Activity["activityType"]) {
  return activities.filter((a) => a.activityType === t).length;
}

export default async function behaviorProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const feeding = countType(activities, "feeding");
  const sleep = countType(activities, "sleep");
  const diaper = countType(activities, "diaper");
  const play = countType(activities, "play");

  const out: InsightResult[] = [];

  if (feeding >= 2 && sleep === 0) {
    out.push(
      createInsight(
        "Possible growth spurt. Frequent feeding with reduced sleep.",
        "info",
        now,
        "feeding",
        babyId
      )
    );
  }

  if (feeding < 2 && diaper < 2) {
    out.push(
      createInsight(
        "Hydration concern. Low feeding and diaper activity detected.",
        "strong",
        now,
        "diaper",
        babyId
      )
    );
  }

  if (feeding > 0 && sleep > 0 && diaper > 0 && play > 0) {
    out.push(
      createInsight(
        "Balanced activity. Healthy mix of feeding, sleep, and play.",
        "success",
        now,
        "play",
        babyId
      )
    );
  }

  return out;
}
