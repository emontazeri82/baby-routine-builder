import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(60).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

type BathMetadata = {
  bathType?: string;
  location?: string;
  moodBefore?: string;
  moodAfter?: string;
  temperature?: number;
};

function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function safeMetadata(value: unknown): BathMetadata {
  if (!value || typeof value !== "object") return {};
  return value as BathMetadata;
}

function inc(map: Record<string, number>, key?: string) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function hourInTimezone(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .find((p) => p.type === "hour")?.value ?? "0"
  );
}

function moodScore(mood?: string) {
  switch (mood) {
    case "happy":
      return 3;
    case "calm":
      return 2;
    case "sleepy":
      return 1;
    case "fussy":
      return 0;
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    days: url.searchParams.get("days") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid bath analytics query",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { babyId, days, startDate, endDate } = parsed.data;

  const owned = await db
    .select({ id: babies.id, timezone: babies.timezone })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!owned.length) {
    return NextResponse.json(
      { status: "error", message: "Forbidden" },
      { status: 403 }
    );
  }

  const timezone = owned[0].timezone ?? "UTC";

  const now = new Date();
  const resolvedEnd = endDate ? new Date(endDate) : now;
  const resolvedStart =
    startDate
      ? new Date(startDate)
      : (() => {
          const d = new Date(now);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - ((days ?? 7) - 1));
          return d;
        })();

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
        eq(activityTypes.slug, "bath"),
        gte(activities.startTime, resolvedStart),
        lte(activities.startTime, resolvedEnd)
      )
    );

  const bathType: Record<string, number> = {};
  const location: Record<string, number> = {};
  const moodBefore: Record<string, number> = {};
  const moodAfter: Record<string, number> = {};
  const hourOfDay: Record<number, number> = {};
  const dailyCount: Record<string, number> = {};

  let totalBaths = 0;
  let totalTemperature = 0;
  let tempCount = 0;
  let moodImproved = 0;
  let moodWorsened = 0;

  for (const row of rows) {
    totalBaths += 1;
    const meta = safeMetadata(row.metadata);
    inc(bathType, meta.bathType);
    inc(location, meta.location);
    inc(moodBefore, meta.moodBefore);
    inc(moodAfter, meta.moodAfter);

    const hour = hourInTimezone(new Date(row.startTime), timezone);
    hourOfDay[hour] = (hourOfDay[hour] ?? 0) + 1;

    const key = zonedDateKey(new Date(row.startTime), timezone);
    dailyCount[key] = (dailyCount[key] ?? 0) + 1;

    if (typeof meta.temperature === "number" && Number.isFinite(meta.temperature)) {
      totalTemperature += meta.temperature;
      tempCount += 1;
    }

    const beforeScore = moodScore(meta.moodBefore);
    const afterScore = moodScore(meta.moodAfter);
    if (beforeScore !== null && afterScore !== null) {
      if (afterScore > beforeScore) moodImproved += 1;
      if (afterScore < beforeScore) moodWorsened += 1;
    }
  }

  const daily = Object.entries(dailyCount)
    .map(([date, totalBaths]) => ({ date, totalBaths }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const requestedDays =
    days ??
    Math.max(
      1,
      Math.floor(
        (resolvedEnd.getTime() - resolvedStart.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1
    );
  const averageBathsPerDay =
    requestedDays > 0 ? Number((totalBaths / requestedDays).toFixed(1)) : 0;
  const weeklyFrequency =
    requestedDays > 0 ? Number(((totalBaths / requestedDays) * 7).toFixed(1)) : 0;

  const mostCommonBathHour = Object.entries(hourOfDay).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  return NextResponse.json({
    summary: {
      totalBaths,
      averageBathsPerDay,
      weeklyFrequency,
      mostCommonBathHour:
        typeof mostCommonBathHour === "string" ? Number(mostCommonBathHour) : null,
      averageTemperature:
        tempCount > 0 ? Number((totalTemperature / tempCount).toFixed(1)) : null,
      moodImproved,
      moodWorsened,
    },
    distributions: {
      bathType,
      location,
      moodBefore,
      moodAfter,
      hourOfDay,
    },
    daily,
  });
}
