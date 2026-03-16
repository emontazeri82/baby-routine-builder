import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

export type TemperatureUnit = "C" | "F";

export interface TemperatureInput {
  value?: number;
  unit: TemperatureUnit;
}

export interface NormalizedTemperature {
  valueC: number;
  valueF: number;
}

export type TemperatureStatus =
  | "low"
  | "normal"
  | "mild_fever"
  | "fever"
  | "high_fever";

const CELSIUS_LIMITS = {
  min: 30,
  max: 45,
};

const FAHRENHEIT_LIMITS = {
  min: 86,
  max: 113,
};

export class TemperatureService {
  /**
   * Convert Fahrenheit to Celsius
   */
  static toCelsius(f: number): number {
    return (f - 32) * (5 / 9);
  }

  /**
   * Convert Celsius to Fahrenheit
   */
  static toFahrenheit(c: number): number {
    return c * (9 / 5) + 32;
  }

  /**
   * Normalize temperature to both units
   */
  static normalize(input: TemperatureInput): NormalizedTemperature | null {
    if (input.value === undefined || Number.isNaN(input.value)) {
      return null;
    }

    const valueC =
      input.unit === "F"
        ? TemperatureService.toCelsius(input.value)
        : input.value;

    const valueF =
      input.unit === "C"
        ? TemperatureService.toFahrenheit(input.value)
        : input.value;

    return {
      valueC,
      valueF,
    };
  }

  /**
   * Validate temperature range
   */
  static isValid(input: TemperatureInput): boolean {
    if (input.value === undefined) return false;

    const { min, max } =
      input.unit === "C" ? CELSIUS_LIMITS : FAHRENHEIT_LIMITS;

    return input.value >= min && input.value <= max;
  }

  /**
   * Classify temperature health status
   */
  static classify(input: TemperatureInput): TemperatureStatus | null {
    const normalized = this.normalize(input);

    if (!normalized) return null;

    const c = normalized.valueC;

    if (c < 36) return "low";
    if (c < 37.6) return "normal";
    if (c < 38) return "mild_fever";
    if (c < 39) return "fever";

    return "high_fever";
  }

  /**
   * Detect fever
   */
  static isFever(input: TemperatureInput): boolean {
    const status = this.classify(input);
    return status === "fever" || status === "high_fever";
  }

  /**
   * Format temperature for UI display
   */
  static format(value: number, unit: TemperatureUnit): string {
    return `${value.toFixed(1)}°${unit}`;
  }

  /**
   * Build safe metadata object for activities
   */
  static buildMetadata(input: TemperatureInput) {
    if (!this.isValid(input)) return null;

    const normalized = this.normalize(input);

    if (!normalized) return null;

    return {
      value: input.value,
      unit: input.unit,
      valueC: normalized.valueC,
      valueF: normalized.valueF,
      status: this.classify(input),
      recordedAt: new Date().toISOString(),
    };
  }
}

type TemperatureAnalyticsParams = {
  babyId: string;
  startDate: Date;
  endDate: Date;
};

export async function getTemperatureAnalytics({
  babyId,
  startDate,
  endDate,
}: TemperatureAnalyticsParams) {
  const baby = await db
    .select({ timezone: babies.timezone })
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  const timezone = baby[0]?.timezone ?? "UTC";

  const rows = await db
    .select({
      startTime: activities.startTime,
      metadata: activities.metadata,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activityTypes.slug, "temperature"),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      )
    );

  const zonedDateKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };

  const hourInTimezone = (date: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hour12: false,
      })
        .formatToParts(date)
        .find((p) => p.type === "hour")?.value ?? "0"
    );

  const readingsC: number[] = [];
  const hourCount: Record<number, number> = {};
  const byDay: Record<string, number[]> = {};

  let feverCount = 0;
  let highFeverCount = 0;

  for (const row of rows) {
    const raw = row.metadata as Record<string, unknown> | null;
    if (!raw) continue;

    const value =
      typeof raw.value === "number" && Number.isFinite(raw.value)
        ? raw.value
        : undefined;
    const unit = raw.unit === "F" ? "F" : raw.unit === "C" ? "C" : undefined;
    if (value === undefined || !unit) continue;

    const normalized = TemperatureService.normalize({ value, unit });
    if (!normalized) continue;
    const celsius = normalized.valueC;

    readingsC.push(celsius);

    if (celsius >= 38) feverCount += 1;
    if (celsius >= 39) highFeverCount += 1;

    const dayKey = zonedDateKey(new Date(row.startTime));
    byDay[dayKey] = byDay[dayKey] ?? [];
    byDay[dayKey].push(celsius);

    const hour = hourInTimezone(new Date(row.startTime));
    hourCount[hour] = (hourCount[hour] ?? 0) + 1;
  }

  const daily = Object.entries(byDay)
    .map(([date, values]) => {
      const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
      const max = Math.max(...values);
      return {
        date,
        avgTemperature: Number(avg.toFixed(1)),
        maxTemperature: Number(max.toFixed(1)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const avgTemperature =
    readingsC.length > 0
      ? Number(
          (readingsC.reduce((acc, v) => acc + v, 0) / readingsC.length).toFixed(1)
        )
      : null;
  const maxTemperature =
    readingsC.length > 0 ? Number(Math.max(...readingsC).toFixed(1)) : null;
  const minTemperature =
    readingsC.length > 0 ? Number(Math.min(...readingsC).toFixed(1)) : null;
  const mostCommonHourRaw = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    daily,
    summary: {
      avgTemperature,
      maxTemperature,
      minTemperature,
      feverCount,
      highFeverCount,
      mostCommonHour:
        typeof mostCommonHourRaw === "string" ? Number(mostCommonHourRaw) : null,
    },
  };
}
