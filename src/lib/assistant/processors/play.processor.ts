import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";
import { createInsight } from "./processorUtils";

function playActs(activities: Activity[]) {
  return activities.filter((a) => a.activityType === "play" && a.startTime);
}

export default async function playProcessor(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const acts = playActs(activities);
  const out: InsightResult[] = [];

  if (acts.length === 0) {
    out.push(
      createInsight(
        "Low activity. Limited play activity in the selected window.",
        "info",
        now,
        "play",
        babyId
      )
    );
    return out;
  }

  if (acts.length >= 3) {
    out.push(
      createInsight(
        "Very active day. High level of play activity.",
        "success",
        now,
        "play",
        babyId
      )
    );
  }

  return out;
}
