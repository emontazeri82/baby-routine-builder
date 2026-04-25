// /lib/assistant/drawerAnalysis/trend.ts

export type TrendDirection = "up" | "down" | "stable" | null;

export type TrendResult = {
  direction: TrendDirection;
  changePercent: number | null;
  message: string;
  isValid: boolean;
};

export type TrendInput = {
  gaps: number[] | null; // minutes between activities (most recent first)
  sampleSize?: number; // how many recent gaps to consider
};

export function detectTrend(input: TrendInput): TrendResult {
  const { gaps, sampleSize = 4 } = input;

  // Guard: not enough data
  if (!gaps || gaps.length < 2) {
    return {
      direction: null,
      changePercent: null,
      message: "Not enough data to detect trend",
      isValid: false,
    };
  }

  const recent = gaps.slice(0, sampleSize).filter((g) => g > 0);

  if (recent.length < 2) {
    return {
      direction: null,
      changePercent: null,
      message: "Not enough valid data",
      isValid: false,
    };
  }

  const first = recent[0];
  const last = recent[recent.length - 1];

  const rawChange = ((first - last) / last) * 100;
  const changePercent = Math.round(rawChange);

  let direction: TrendDirection = "stable";
  let message = "Stable pattern";

  if (rawChange > 15) {
    direction = "up";
    message = "Intervals are increasing";
  } else if (rawChange < -15) {
    direction = "down";
    message = "Intervals are decreasing";
  }

  return {
    direction,
    changePercent,
    message,
    isValid: true,
  };
}
