import { format } from "date-fns-tz";

interface DiaperMeta {
  type: "wet" | "dirty" | "mixed";
  rash: boolean;
  volume?: "small" | "medium" | "large" | null;
  color?: string | null;
  texture?: string | null;
}

export function generateDiaperAnalytics(
  activities: any[],
  timezone: string
) {
  const dailyMap: Record<string, any> = {};

  /* ---------------- Group By Local Date ---------------- */

  for (const act of activities) {
    const dateKey = format(
      new Date(act.startTime),
      "yyyy-MM-dd",
      { timeZone: timezone }
    );

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = createEmptyDay(dateKey);
    }

    const meta: DiaperMeta = act.metadata || {};

    dailyMap[dateKey].total++;

    if (meta.type === "wet") dailyMap[dateKey].wet++;
    if (meta.type === "dirty") dailyMap[dateKey].dirty++;
    if (meta.type === "mixed") {
      dailyMap[dateKey].mixed++;
      dailyMap[dateKey].wet++;
      dailyMap[dateKey].dirty++;
    }

    if (meta.rash) dailyMap[dateKey].rash++;

    if (meta.texture === "watery") dailyMap[dateKey].watery++;
    if (meta.texture === "hard") dailyMap[dateKey].hard++;

    if (meta.volume === "small") dailyMap[dateKey].smallVolume++;
    if (meta.volume === "large") dailyMap[dateKey].largeVolume++;
  }

  /* ---------------- Fill Missing Days ---------------- */

  const daily = fillMissingDays(dailyMap);

  /* ---------------- Baseline (7-Day Rolling) ---------------- */

  const last7 = daily.slice(-7);
  const baseline = calculateAverages(last7);

  /* ---------------- Alerts ---------------- */

  const alerts = generateAlerts(daily, baseline, activities);

  return {
    summary: baseline,
    daily,
    alerts,
  };
}

/* ================= Helpers ================= */

function createEmptyDay(date: string) {
  return {
    date,
    total: 0,
    wet: 0,
    dirty: 0,
    mixed: 0,
    rash: 0,
    watery: 0,
    hard: 0,
    smallVolume: 0,
    largeVolume: 0,
  };
}

/* -------- Fill Missing Calendar Days -------- */

function fillMissingDays(
  map: Record<string, any>
) {
  const dates = Object.keys(map).sort();
  if (!dates.length) return [];

  const start = dates[0];
  const end = dates[dates.length - 1];

  const result: any[] = [];
  let current = start;

  while (current <= end) {
    if (map[current]) {
      result.push(map[current]);
    } else {
      result.push(createEmptyDay(current));
    }

    current = addOneDayKey(current);
  }

  return result;
}

function addOneDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/* -------- Baseline -------- */

function calculateAverages(days: any[]) {
  if (!days.length) return null;

  const sum = days.reduce(
    (acc, d) => {
      acc.total += d.total;
      acc.wet += d.wet;
      acc.dirty += d.dirty;
      acc.rash += d.rash;
      acc.watery += d.watery;
      acc.hard += d.hard;
      return acc;
    },
    { total: 0, wet: 0, dirty: 0, rash: 0, watery: 0, hard: 0 }
  );

  const count = days.length;

  return {
    avgTotal: sum.total / count,
    avgWet: sum.wet / count,
    avgDirty: sum.dirty / count,
    avgRash: sum.rash / count,
    avgWatery: sum.watery / count,
    avgHard: sum.hard / count,
  };
}

/* -------- Alerts -------- */

function generateAlerts(
  daily: any[],
  baseline: any,
  activities: any[]
) {
  if (!baseline || daily.length < 5) return [];

  const today = daily[daily.length - 1];
  const alerts: any[] = [];

  /* Hydration Drop (unchanged logic) */
  if (today.wet < baseline.avgWet * 0.6) {
    alerts.push({
      type: "hydration",
      severity: "medium",
      message: "Wet diaper frequency dropped significantly.",
    });
  }

  /* -------- Real 48h Constipation Check -------- */

  const lastDirtyActivity = [...activities]
    .filter((a) => {
      const meta: DiaperMeta = a.metadata || {};
      return meta.type === "dirty" || meta.type === "mixed";
    })
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() -
        new Date(a.startTime).getTime()
    )[0];

  if (lastDirtyActivity) {
    const nowMs = Date.now();
    const hoursSinceLastDirty =
      (nowMs -
        new Date(lastDirtyActivity.startTime).getTime()) /
      (1000 * 60 * 60);

    if (hoursSinceLastDirty > 48) {
      alerts.push({
        type: "constipation",
        severity: "medium",
        message: "No stool recorded in last 48 hours.",
      });
    }
  }

  /* Diarrhea Spike (unchanged) */
  if (today.watery >= 3) {
    alerts.push({
      type: "diarrhea",
      severity: "high",
      message: "Multiple watery stools detected today.",
    });
  }

  /* Rash Increase (unchanged) */
  if (today.rash > baseline.avgRash * 2 && today.rash >= 2) {
    alerts.push({
      type: "rash",
      severity: "low",
      message: "Rash frequency increasing.",
    });
  }

  /* -------- Red Stool Critical Alert -------- */

  const redStool = activities.find((a) => {
    const meta: DiaperMeta = a.metadata || {};
    return meta.color === "red";
  });

  if (redStool) {
    alerts.push({
      type: "critical",
      severity: "high",
      message: "Red stool detected. Please consult a healthcare provider.",
    });
  }

  return alerts;
}
