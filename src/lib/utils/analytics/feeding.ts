export interface FeedingAnalyticsResult {
  daily: {
    date: string;
    feeds: number;
    totalIntakeMl: number;
    totalDuration: number;
    nightFeeds: number;
    nightIntakeMl: number;
  }[];
  summary: any;
}

type FeedingAnalyticsOptions = {
  rangeDays?: number;
  rangeEnd?: Date;
};

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]) {
  if (!values.length) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function zonedDateKey(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (t: string) =>
    parts.find((p) => p.type === t)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function zonedDateParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function toZonedWallClockDate(date: Date, tz: string) {
  const p = zonedDateParts(date, tz);
  return new Date(
    Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
      0
    )
  );
}

function wallClockDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Calculates night overlap (7PM–5AM) in minutes.
 * Uses UTC-safe math.
 */
function calculateNightOverlap(start: Date, end: Date): number {
  if (end <= start) return 0;

  let totalNightMinutes = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const nightStart = new Date(cursor);
    nightStart.setUTCHours(19, 0, 0, 0);

    const nightEnd = new Date(nightStart);
    nightEnd.setUTCDate(nightEnd.getUTCDate() + 1);
    nightEnd.setUTCHours(5, 0, 0, 0);

    const overlapStart = new Date(
      Math.max(start.getTime(), nightStart.getTime())
    );
    const overlapEnd = new Date(
      Math.min(end.getTime(), nightEnd.getTime())
    );

    if (overlapEnd > overlapStart) {
      totalNightMinutes +=
        (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return totalNightMinutes;
}

function extractIntakeMl(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") return 0;

  const record = metadata as Record<string, unknown>;

  const directCandidates = [
    record.intakeMl,
    record.amountMl,
    record.totalMl,
    record.volumeMl,
    record.milliliters,
  ];

  for (const value of directCandidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  const amount =
    typeof record.amount === "number" && Number.isFinite(record.amount)
      ? record.amount
      : null;
  const unit = typeof record.unit === "string" ? record.unit.toLowerCase() : null;

  if (amount !== null) {
    if (unit === "oz") return amount * 29.5735;
    if (unit === "ml") return amount;
  }

  return 0;
}

function isNightFeed(start: Date, timezone: string) {
  const hour = zonedDateParts(start, timezone).hour;
  return hour >= 19 || hour < 5;
}

export function calculateFeedingAnalytics(
  records: any[],
  timezone: string,
  options: FeedingAnalyticsOptions = {}
): FeedingAnalyticsResult {
  const dailyMap = new Map<string, any>();
  let orderedRangeKeys: string[] = [];
  let rangeDateKeys: Set<string> | null = null;

  let totalFeeds = 0;
  let totalIntakeMl = 0;
  let totalDuration = 0;
  let nightFeeds = 0;
  let nightIntake = 0;

  const durations: number[] = [];
  const intervals: number[] = [];

  // Sort chronologically
  records.sort(
    (a, b) =>
      new Date(a.startTime).getTime() -
      new Date(b.startTime).getTime()
  );

  if (options.rangeDays && options.rangeDays > 0) {
    const rangeEnd = options.rangeEnd ?? new Date();
    const wallEnd = toZonedWallClockDate(rangeEnd, timezone);
    wallEnd.setUTCHours(0, 0, 0, 0);

    orderedRangeKeys = [];
    for (let i = options.rangeDays - 1; i >= 0; i--) {
      const day = new Date(wallEnd);
      day.setUTCDate(day.getUTCDate() - i);
      orderedRangeKeys.push(wallClockDateKey(day));
    }
    rangeDateKeys = new Set(orderedRangeKeys);
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    const start = new Date(r.startTime);
    const explicitEnd = r.endTime ? new Date(r.endTime) : null;
    const fallbackDuration =
      typeof r.durationMinutes === "number" && Number.isFinite(r.durationMinutes)
        ? r.durationMinutes
        : null;

    const end =
      explicitEnd ??
      (fallbackDuration !== null
        ? new Date(start.getTime() + fallbackDuration * 60000)
        : null);

    const duration = end
      ? Math.max(0, (end.getTime() - start.getTime()) / 60000)
      : 0;
    const intake = extractIntakeMl(r.metadata);

    totalFeeds++;
    totalIntakeMl += intake;
    totalDuration += duration;
    durations.push(duration);

    const dateKey = zonedDateKey(start, timezone);
    if (rangeDateKeys && !rangeDateKeys.has(dateKey)) continue;

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        feeds: 0,
        totalIntakeMl: 0,
        totalDuration: 0,
        nightFeeds: 0,
        nightIntakeMl: 0,
      });
    }

    const day = dailyMap.get(dateKey);

    day.feeds += 1;
    day.totalIntakeMl += intake;
    day.totalDuration += duration;

    // Night overlap detection
    const nightOverlap = end
      ? calculateNightOverlap(
          toZonedWallClockDate(start, timezone),
          toZonedWallClockDate(end, timezone)
        )
      : 0;
    const isNight = nightOverlap > 0 || isNightFeed(start, timezone);

    if (isNight) {
      nightFeeds++;
      nightIntake += intake;
      day.nightFeeds += 1;
      day.nightIntakeMl += intake;
    }

    // Interval calculation
    if (i > 0) {
      const prev = records[i - 1];
      const prevMarker = new Date(prev.endTime ?? prev.startTime);

      const interval =
        (start.getTime() - prevMarker.getTime()) / 60000;

      if (interval > 0) intervals.push(interval);
    }
  }

  let daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (orderedRangeKeys.length > 0) {
    const filled: FeedingAnalyticsResult["daily"] = [];
    for (const key of orderedRangeKeys) {
      const existing = dailyMap.get(key);

      filled.push(
        existing ?? {
          date: key,
          feeds: 0,
          totalIntakeMl: 0,
          totalDuration: 0,
          nightFeeds: 0,
          nightIntakeMl: 0,
        }
      );
    }

    daily = filled;
  }

  const avgFeedsPerDay = mean(daily.map((d) => d.feeds));
  const avgIntervalMinutes = mean(intervals);
  const avgFeedDuration = mean(durations);

  const longestGapMinutes =
    intervals.length > 0 ? Math.max(...intervals) : 0;

  const shortestIntervalMinutes =
    intervals.length > 0 ? Math.min(...intervals) : 0;

  const longestFeedMinutes =
    durations.length > 0 ? Math.max(...durations) : 0;

  const shortestFeedMinutes =
    durations.length > 0 ? Math.min(...durations) : 0;

  const feedingConsistencyScore = Math.max(
    0,
    100 - stdDev(intervals)
  );

  const clusterFeedingDetected =
    intervals.filter((i) => i < 90).length >= 3;

  return {
    daily,
    summary: {
      totalFeeds,
      avgFeedsPerDay,
      feedsPerDayStdDev: stdDev(daily.map((d) => d.feeds)),

      avgIntervalMinutes,
      intervalStdDev: stdDev(intervals),
      longestGapMinutes,
      shortestIntervalMinutes,

      avgFeedDurationMinutes: avgFeedDuration,
      longestFeedMinutes,
      shortestFeedMinutes,

      totalIntakeMl,
      avgIntakePerFeedMl:
        totalFeeds > 0 ? totalIntakeMl / totalFeeds : 0,
      avgIntakePerDayMl:
        daily.length > 0 ? totalIntakeMl / daily.length : 0,

      nightFeedsCount: nightFeeds,
      nightFeedRatioPercent:
        totalFeeds > 0 ? (nightFeeds / totalFeeds) * 100 : 0,
      nightIntakeMl: nightIntake,

      feedingConsistencyScore,
      clusterFeedingDetected,
    },
  };
}
