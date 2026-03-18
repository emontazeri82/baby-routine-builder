import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";

/* ---------------- Query Schema ---------------- */

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().min(1).max(60).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type PumpSide = "left" | "right" | "both";

export type PumpComfort =
  | "comfortable"
  | "neutral"
  | "painful";

export type PumpingMetadata = {
  side?: PumpSide;
  amountMl?: number;          // total milk amount expressed (ml)
  durationMinutes?: number;   // pumping session duration
  comfort?: PumpComfort;
  unit?: "ml" | "oz";         // optional because frontend still sends it
  notes?: string;             // optional notes if included in metadata
};
/* ---------------- Helpers ---------------- */

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

function safeMetadata(value: unknown): PumpingMetadata | null {
  if (!value || typeof value !== "object") return null;
  return value as PumpingMetadata;
}

function inc(map: Record<string, number>, key?: string) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

/* ---------------- Route ---------------- */

export async function GET(req: Request) {
  try {

    /* ---------------- Auth ---------------- */

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ---------------- Query Validation ---------------- */

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
          message: "Invalid pumping analytics query",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { babyId, days, startDate, endDate } = parsed.data;

    /* ---------------- Verify Baby Ownership ---------------- */

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

    /* ---------------- Resolve Date Range ---------------- */

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

    /* ---------------- Fetch Pumping Activities ---------------- */

    const rows = await db
      .select({
        startTime: activities.startTime,
        metadata: activities.metadata,
        durationMinutes: activities.durationMinutes,
        endTime: activities.endTime,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activityTypes.slug, "pumping"),
          gte(activities.startTime, resolvedStart),
          lte(activities.startTime, resolvedEnd)
        )
      );

    /* ---------------- Aggregation ---------------- */

    const side: Record<string, number> = {};
    const hourOfDay: Record<number, number> = {};
    const dailyAmount: Record<string, number> = {};
    const dailySessions: Record<string, number> = {};

    let totalSessions = 0;
    let totalAmount = 0;
    let totalDuration = 0;
    let amountSessions = 0;
    let durationSessions = 0;
    let painfulSessions = 0;
    let comfortSessions = 0;

    for (const row of rows) {
      totalSessions++;

      const dateKey = zonedDateKey(new Date(row.startTime), timezone);
      dailySessions[dateKey] = (dailySessions[dateKey] ?? 0) + 1;

      const hour = hourInTimezone(new Date(row.startTime), timezone);
      hourOfDay[hour] = (hourOfDay[hour] ?? 0) + 1;

      const meta = safeMetadata(row.metadata);
      if (!meta) continue;

      const amount = typeof meta.amountMl === "number" ? meta.amountMl : null;
      const duration =
        typeof meta.durationMinutes === "number"
          ? meta.durationMinutes
          : typeof row.durationMinutes === "number"
            ? row.durationMinutes
            : row.endTime
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(row.endTime).getTime() - new Date(row.startTime).getTime()) / 60000
                  )
                )
              : null;

      if (amount !== null) {
        totalAmount += amount;
        amountSessions += 1;
        dailyAmount[dateKey] = (dailyAmount[dateKey] ?? 0) + amount;
      }

      if (duration !== null) {
        totalDuration += duration;
        durationSessions += 1;
      }

      inc(side, meta.side);

      if (meta.comfort) {
        comfortSessions += 1;
        if (meta.comfort === "painful") {
          painfulSessions++;
        }
      }
    }

    /* ---------------- Daily ---------------- */

    const daily = Object.keys(dailySessions)
      .map((date) => ({
        date,
        totalAmount: dailyAmount[date] ?? 0,
        sessions: dailySessions[date],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    /* ---------------- Summary ---------------- */

    const avgAmountPerSession =
      amountSessions > 0 ? totalAmount / amountSessions : 0;

    const avgDuration =
      durationSessions > 0 ? totalDuration / durationSessions : 0;

    const mostCommonSide =
      Object.entries(side).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const mostCommonHour =
      Object.entries(hourOfDay).sort((a, b) => b[1] - a[1])[0]?.[0];

    const painRatioPercent =
      comfortSessions > 0
        ? Number(((painfulSessions / comfortSessions) * 100).toFixed(1))
        : 0;

    /* ---------------- Response ---------------- */

    return NextResponse.json({
      summary: {
        totalSessions,
        totalAmountMl: Math.round(totalAmount),
        avgAmountPerSessionMl: Math.round(avgAmountPerSession),
        avgDurationMinutes: Math.round(avgDuration),
        mostCommonSide,
        mostCommonHour:
          typeof mostCommonHour === "string"
            ? Number(mostCommonHour)
            : null,
        painRatioPercent,
      },
      distributions: {
        side,
        hourOfDay,
      },
      daily,
    });

  } catch (error) {
    console.error("PUMPING ANALYTICS ERROR:", error);

    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
