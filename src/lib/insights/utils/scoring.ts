import { UIInsight } from "../types";

export function calculateScore(
  insight: UIInsight,
  context?: {
    now?: Date;
    relatedTime?: string;
    dataPoints?: number;
  }
): number {
  const now = context?.now ?? new Date();

  const severityWeight = {
    critical: 100,
    strong: 100,
    warning: 70,
    info: 40,
    success: 20,
  };

  const sev = insight.severity ?? "info";
  let score =
    severityWeight[sev as keyof typeof severityWeight] ?? severityWeight.info;

  // 🔥 1. TYPE BOOST
  if (insight.type === "critical") score += 30;
  if (insight.type === "behavior") score += 15;
  if (insight.type === "completion") score += 10;

  // 🔥 2. ACTIONABLE BOOST
  if (insight.actionLabel) score += 10;

  // 🔥 3. RECENCY BOOST
  if (context?.relatedTime) {
    const diffMinutes =
      (now.getTime() - new Date(context.relatedTime).getTime()) / 60000;

    if (diffMinutes < 30) score += 25;
    else if (diffMinutes < 120) score += 10;
  }

  // 🔥 4. CONFIDENCE (avoid weak signals)
  if (context?.dataPoints !== undefined) {
    if (context.dataPoints < 2) score -= 20;
    if (context.dataPoints >= 5) score += 10;
  }

  return score;
}