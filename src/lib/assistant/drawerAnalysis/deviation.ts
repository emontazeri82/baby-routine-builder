// /lib/assistant/drawerAnalysis/deviation.ts

export type DeviationSeverity = "normal" | "warning" | "critical";

export type DeviationResult = {
  deviationPercent: number | null;
  severity: DeviationSeverity;
  message: string;
  isValid: boolean;
};

export type DeviationInput = {
  avgGapMinutes: number | null;
  minutesSinceLast: number | null;
  thresholds?: {
    warningAbove?: number;
    criticalAbove?: number;
    earlyBelow?: number;
  };
};

const DEFAULT_THRESHOLDS = {
  warningAbove: 20,
  criticalAbove: 50,
  earlyBelow: -30,
};

export function detectDeviation(input: DeviationInput): DeviationResult {
  const {
    avgGapMinutes,
    minutesSinceLast,
    thresholds = DEFAULT_THRESHOLDS,
  } = input;

  // 🚫 Guard: missing or invalid data (use explicit checks — 0 min since last is valid)
  if (
    avgGapMinutes == null ||
    minutesSinceLast == null ||
    Number.isNaN(avgGapMinutes) ||
    Number.isNaN(minutesSinceLast) ||
    avgGapMinutes <= 0 ||
    minutesSinceLast < 0
  ) {
    return {
      deviationPercent: null,
      severity: "normal",
      message: "Not enough data to evaluate",
      isValid: false,
    };
  }

  // 📊 Compute deviation %
  const rawDeviation =
    ((minutesSinceLast - avgGapMinutes) / avgGapMinutes) * 100;

  const deviationPercent = Math.round(rawDeviation);

  // 🧠 Determine severity
  let severity: DeviationSeverity = "normal";
  let message = "Within normal range";

  if (rawDeviation >= thresholds.criticalAbove!) {
    severity = "critical";
    message = "Significantly delayed compared to usual";
  } else if (rawDeviation >= thresholds.warningAbove!) {
    severity = "warning";
    message = "Slightly delayed compared to normal timing";
  } else if (rawDeviation <= thresholds.earlyBelow!) {
    severity = "warning";
    message = "Happening earlier than expected";
  }

  return {
    deviationPercent,
    severity,
    message,
    isValid: true,
  };
}