// /lib/assistant/drawerAnalysis/consistency.ts

export type ConsistencyLevel = "low" | "moderate" | "high";

export type ConsistencyResult = {
  score: number | null; // 0–100
  level: ConsistencyLevel;
  variance: number | null;
  message: string;
  isValid: boolean;
};

export type ConsistencyInput = {
  gaps: number[] | null;
  minSamples?: number;
};

export function detectConsistency(input: ConsistencyInput): ConsistencyResult {
  const { gaps, minSamples = 3 } = input;

  if (!gaps || gaps.length < minSamples) {
    return {
      score: null,
      level: "low",
      variance: null,
      message: "Not enough data",
      isValid: false,
    };
  }

  const valid = gaps.filter((g) => g > 0);

  if (valid.length < minSamples) {
    return {
      score: null,
      level: "low",
      variance: null,
      message: "Not enough valid samples",
      isValid: false,
    };
  }

  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;

  const variance =
    valid.reduce((sum, g) => sum + Math.pow(g - avg, 2), 0) / valid.length;

  const stdDev = Math.sqrt(variance);

  const rawScore = 100 - (stdDev / avg) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: ConsistencyLevel = "moderate";
  let message = "Moderately consistent routine";

  if (score >= 75) {
    level = "high";
    message = "Highly consistent routine";
  } else if (score < 40) {
    level = "low";
    message = "Irregular routine detected";
  }

  return {
    score,
    level,
    variance: Math.round(variance),
    message,
    isValid: true,
  };
}
