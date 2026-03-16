import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

type BathAnalyticsParams = {
  babyId: string;
  startDate: Date;
  endDate: Date;
};

export async function getBathAnalytics({
  babyId,
  startDate,
  endDate,
}: BathAnalyticsParams) {
  const baby = await db
    .select({ timezone: babies.timezone })
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  const timezone = baby[0]?.timezone ?? "UTC";

  const rows = await db
    .select({
      metadata: activities.metadata,
      startTime: activities.startTime,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activityTypes.slug, "bath"),
        eq(activities.babyId, babyId),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      )
    );

  let totalBaths = 0;

  const bathTypeCount: Record<string, number> = {};
  const locationCount: Record<string, number> = {};
  const moodBeforeCount: Record<string, number> = {};
  const moodAfterCount: Record<string, number> = {};
  const hourCount: Record<number, number> = {};

  let temperatureTotal = 0;
  let temperatureSamples = 0;

  const dailyMap: Record<string, number> = {};

  let moodImproved = 0;
  let moodWorsened = 0;

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

  for (const row of rows) {
    totalBaths++;

    const dateKey = zonedDateKey(new Date(row.startTime));
    dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + 1;

    const hour = hourInTimezone(new Date(row.startTime));
    hourCount[hour] = (hourCount[hour] ?? 0) + 1;

    if (row.metadata && typeof row.metadata === "object") {
      const meta = row.metadata as Record<string, unknown>;

      const bathType = meta.bathType as string | undefined;
      const location = meta.location as string | undefined;
      const moodBefore = meta.moodBefore as string | undefined;
      const moodAfter = meta.moodAfter as string | undefined;
      const temperature = meta.temperature as number | undefined;

      if (bathType) {
        bathTypeCount[bathType] = (bathTypeCount[bathType] ?? 0) + 1;
      }

      if (location) {
        locationCount[location] = (locationCount[location] ?? 0) + 1;
      }

      if (moodBefore) {
        moodBeforeCount[moodBefore] = (moodBeforeCount[moodBefore] ?? 0) + 1;
      }

      if (moodAfter) {
        moodAfterCount[moodAfter] = (moodAfterCount[moodAfter] ?? 0) + 1;
      }

      if (typeof temperature === "number") {
        temperatureTotal += temperature;
        temperatureSamples++;
      }

      if (moodBefore && moodAfter) {
        if (moodBefore === "fussy" && moodAfter === "calm") {
          moodImproved++;
        }

        if (moodBefore === "calm" && moodAfter === "fussy") {
          moodWorsened++;
        }
      }
    }
  }

  const averageTemperature =
    temperatureSamples > 0
      ? Number((temperatureTotal / temperatureSamples).toFixed(1))
      : null;

  const mostCommonHour = Object.entries(hourCount).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? null;

  const daily = Object.entries(dailyMap)
    .map(([date, total]) => ({
      date,
      totalBaths: total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysInRange = Math.max(
    1,
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  const averageBathsPerDay = Number((totalBaths / daysInRange).toFixed(1));

  const weeklyFrequency = Number(
    ((totalBaths / daysInRange) * 7).toFixed(1)
  );

  return {
    summary: {
      totalBaths,
      averageBathsPerDay,
      weeklyFrequency,
      mostCommonBathHour: mostCommonHour,
      averageTemperature,
      moodImproved,
      moodWorsened,
    },

    distributions: {
      bathType: bathTypeCount,
      location: locationCount,
      moodBefore: moodBeforeCount,
      moodAfter: moodAfterCount,
      hourOfDay: hourCount,
    },

    daily,
  };
}
