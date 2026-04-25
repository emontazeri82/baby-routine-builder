import type { Activity } from "@/lib/insights/activity.types";
import type { InsightResult } from "@/lib/insights/types";

import feedingProcessor from "./feeding.processor";
import sleepProcessor from "./sleep.processor";
import napProcessor from "./nap.processor";
import playProcessor from "./play.processor";
import behaviorProcessor from "./behavior.processor";
import diaperProcessor from "./diaperProcessor.runtime";
import medicineProcessor from "./medicineProcessor";
import temperatureProcessor from "./temperatureProcessor";
import bathProcessor from "./bathProcessor";
import growthProcessor from "./growthProcessor";
import pumpingProcessor from "./pumpingProcessor";
type ProcessorFn = (
  activities: Activity[],
  now: Date,
  babyId?: string
) => Promise<InsightResult[]>;

const RAW_PROCESSORS = [
  feedingProcessor,
  sleepProcessor,
  napProcessor,
  playProcessor,
  behaviorProcessor,
  diaperProcessor,
  medicineProcessor,
  temperatureProcessor,
  bathProcessor,
  growthProcessor,
  pumpingProcessor,
] as const;

const PROCESSORS: ProcessorFn[] = RAW_PROCESSORS.filter((fn): fn is ProcessorFn => {
  const ok = typeof fn === "function";
  if (!ok && process.env.NODE_ENV === "development") {
    console.warn(
      "[runInsightProcessors] Missing or invalid default export — check processor file is not empty."
    );
  }
  return ok;
});

export async function runInsightProcessors(
  activities: Activity[],
  now: Date,
  babyId?: string
): Promise<InsightResult[]> {
  const chunks = await Promise.all(
    PROCESSORS.map(async (fn) => {
      try {
        return await fn(activities, now, babyId);
      } catch (err) {
        console.warn("[runInsightProcessors] processor failed", err);
        return [];
      }
    })
  );

  const merged = chunks.flat();
  const seen = new Set<string>();

  return merged.filter((row) => {
    const key = `${row.category ?? "x"}-${row.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default runInsightProcessors;
