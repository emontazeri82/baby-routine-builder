// /lib/assistant/drawerAnalysis/missed.ts

export type MissedSeverity = "none" | "warning" | "critical";

export type MissedResult = {
  isMissed: boolean;
  severity: MissedSeverity;
  overdueMinutes: number | null;
  message: string;
  isValid: boolean;
};

export type MissedInput = {
  avgGapMinutes: number | null;     // baseline interval
  minutesSinceLast: number | null;  // current gap
  thresholds?: {
    warningMultiplier?: number;   // e.g. 1.5x avg → warning
    criticalMultiplier?: number;  // e.g. 2.0x avg → critical
  };
};

const DEFAULT_THRESHOLDS = {
  warningMultiplier: 1.5,
  criticalMultiplier: 2.0,
};

export function detectMissed(input: MissedInput): MissedResult {
  const {
    avgGapMinutes,
    minutesSinceLast,
    thresholds = DEFAULT_THRESHOLDS,
  } = input;

  // 🚫 Guard (0 minutes since last log is valid — do not use !minutesSinceLast)
  if (
    avgGapMinutes == null ||
    minutesSinceLast == null ||
    avgGapMinutes <= 0 ||
    minutesSinceLast < 0
  ) {
    return {
      isMissed: false,
      severity: "none",
      overdueMinutes: null,
      message: "Not enough data to determine",
      isValid: false,
    };
  }

  const warningThreshold = avgGapMinutes * thresholds.warningMultiplier!;
  const criticalThreshold = avgGapMinutes * thresholds.criticalMultiplier!;

  let severity: MissedSeverity = "none";
  let message = "On schedule";

  if (minutesSinceLast >= criticalThreshold) {
    severity = "critical";
    message = "Activity likely missed";
  } else if (minutesSinceLast >= warningThreshold) {
    severity = "warning";
    message = "Activity may be overdue";
  }

  const overdueMinutes =
    minutesSinceLast > avgGapMinutes
      ? Math.round(minutesSinceLast - avgGapMinutes)
      : 0;

  return {
    isMissed: severity !== "none",
    severity,
    overdueMinutes,
    message,
    isValid: true,
  };
}