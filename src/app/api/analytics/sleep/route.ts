import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { calculateNightOverlap } from "@/lib/utils/analytics/sleep";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().min(1).max(60).default(7),
});

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function zonedDateKey(date: Date, timeZone: string) {
  const p = zonedDateParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function zonedMinutesOfDay(date: Date, timeZone: string) {
  const p = zonedDateParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

function toZonedWallClockDate(date: Date, timeZone: string) {
  const p = zonedDateParts(date, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0));
}

function wallClockDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function circularMeanMinutes(values: number[]) {
  if (!values.length) return 0;
  const twoPi = Math.PI * 2;
  const unit = twoPi / 1440;

  let x = 0;
  let y = 0;
  for (const m of values) {
    const angle = m * unit;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  const avgAngle = Math.atan2(y / values.length, x / values.length);
  const normalized = (avgAngle + twoPi) % twoPi;
  return (normalized / twoPi) * 1440;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);

    const parsed = querySchema.safeParse({
      babyId: url.searchParams.get("babyId"),
      days: url.searchParams.get("days"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { babyId, days } = parsed.data;

    // Verify baby ownership
    const baby = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);

    if (!baby.length || baby[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get sleep activity type
    const sleepType = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.slug, "sleep"))
      .limit(1);

    if (!sleepType.length) {
      return NextResponse.json(
        { error: "Sleep activity type not found" },
        { status: 500 }
      );
    }

    const sleepTypeId = sleepType[0].id;
    const babyTimeZone = baby[0].timezone ?? "UTC";

    const now = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(now.getDate() - (days - 1));

    const records = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activities.activityTypeId, sleepTypeId),
          gte(activities.startTime, startDate),
          lte(activities.startTime, now)
        )
      );

    const wallEnd = toZonedWallClockDate(now, babyTimeZone);
    wallEnd.setUTCHours(0, 0, 0, 0);
    const orderedRangeKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(wallEnd);
      day.setUTCDate(day.getUTCDate() - i);
      orderedRangeKeys.push(wallClockDateKey(day));
    }
    const allowedDateKeys = new Set(orderedRangeKeys);

    // =========================
    // ADVANCED AGGREGATION
    // =========================

    const dailyMap = new Map<string, number>();
    const dailyNightMap = new Map<string, number>();

    let totalMinutes = 0;
    let longestStretch = 0;
    let shortestNap = Infinity;
    let sleepSessionCount = 0;
    let durationSamples = 0;
    let nightMinutes = 0;

    const bedtimeMinutesList: number[] = [];
    const wakeMinutesList: number[] = [];

    for (const r of records) {
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
        : null;

      sleepSessionCount++;
      if (duration !== null) {
        durationSamples++;
        totalMinutes += duration;
        longestStretch = Math.max(longestStretch, duration);
        shortestNap = Math.min(shortestNap, duration);
      }

      const dateKey = zonedDateKey(start, babyTimeZone);
      if (!allowedDateKeys.has(dateKey)) continue;

      bedtimeMinutesList.push(zonedMinutesOfDay(start, babyTimeZone));
      if (duration !== null && end) {
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + duration);
        wakeMinutesList.push(zonedMinutesOfDay(end, babyTimeZone));

        // Night sleep detection (7PM–5AM)
        const nightOverlap = calculateNightOverlap(
          toZonedWallClockDate(start, babyTimeZone),
          toZonedWallClockDate(end, babyTimeZone)
        );

        nightMinutes += nightOverlap;

        dailyNightMap.set(
          dateKey,
          (dailyNightMap.get(dateKey) || 0) + nightOverlap
        );
      }

    }

    const daily = orderedRangeKeys.map((date) => ({
      date,
      totalMinutes: dailyMap.get(date) || 0,
      nightMinutes: dailyNightMap.get(date) || 0,
    }));

    const avgDailyMinutes =
      daily.length > 0 ? totalMinutes / daily.length : 0;

    const avgSessionMinutes =
      durationSamples > 0 ? totalMinutes / durationSamples : 0;

    const avgNightMinutesPerDay =
      daily.length > 0 ? nightMinutes / daily.length : 0;

    const avgDaytimeMinutesPerDay =
      avgDailyMinutes - avgNightMinutesPerDay;

    const nightRatioPercent =
      totalMinutes > 0
        ? (nightMinutes / totalMinutes) * 100
        : 0;

    const avgBedtimeMinutes = circularMeanMinutes(bedtimeMinutesList);
    const avgWakeTimeMinutes = circularMeanMinutes(wakeMinutesList);

    // Sleep consistency score (lower variance = better)
    const mean = avgDailyMinutes;
    const variance =
      daily.reduce(
        (sum, d) => sum + Math.pow(d.totalMinutes - mean, 2),
        0
      ) / (daily.length || 1);

    const consistencyScore = Math.max(
      0,
      100 - Math.sqrt(variance) / 10
    );

    const bestSleepDay =
      daily.reduce(
        (a, b) =>
          b.totalMinutes > a.totalMinutes ? b : a,
        daily[0] || { totalMinutes: 0 }
      )?.date || null;

    const worstSleepDay =
      daily.reduce(
        (a, b) =>
          b.totalMinutes < a.totalMinutes ? b : a,
        daily[0] || { totalMinutes: 0 }
      )?.date || null;

    // Sleep debt (target 12 hours/day)
    const targetPerDay = 720;
    const expectedTotal = targetPerDay * daily.length;
    const sleepDebtMinutes = Math.max(
      0,
      expectedTotal - totalMinutes
    );

    return NextResponse.json({
      daily,
      summary: {
        totalSleepMinutes: totalMinutes,
        avgDailyMinutes,
        avgNightMinutesPerDay,
        avgDaytimeMinutesPerDay,
        longestStretchMinutes: longestStretch,
        shortestNapMinutes:
          shortestNap === Infinity ? 0 : shortestNap,
        avgNapMinutes: avgSessionMinutes,
        napCount: sleepSessionCount,
        shortestSleepSessionMinutes:
          shortestNap === Infinity ? 0 : shortestNap,
        avgSleepSessionMinutes: avgSessionMinutes,
        sleepSessionCount,
        nightSleepMinutes: nightMinutes,
        nightRatioPercent,
        consistencyScore,
        bestSleepDay,
        worstSleepDay,
        sleepDebtMinutes,
        avgBedtimeMinutes,
        avgWakeTimeMinutes,
        timezone: babyTimeZone,
      },
    });

  } catch (err) {
    console.error("Sleep analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
