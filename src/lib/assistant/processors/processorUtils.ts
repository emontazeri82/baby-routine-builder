import { v4 as uuidv4 } from "uuid";
import type { InsightCategory, InsightResult, InsightSeverity } from "@/lib/insights/types";

export function createInsight(
  message: string,
  severity: InsightSeverity,
  now: Date,
  category: InsightCategory,
  babyId?: string
): InsightResult {
  return {
    id: uuidv4(),
    category,
    type: "activity",
    message,
    severity,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    babyId,
  };
}
