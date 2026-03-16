import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  babies,
  activities,
  reminders,
  reminderOccurrences,
  activityTypes,
} from "@/lib/db/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";

const querySchema = z.object({
  babyId: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedFormatter(timezone: string) {
  const existing = zonedFormatters.get(timezone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  zonedFormatters.set(timezone, formatter);
  return formatter;
}

function toDateKeyInTimezone(date: Date, timezone: string) {
  return getZonedFormatter(timezone).format(date);
}

function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
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
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { babyId, start, end } = parsed.data;

    // verify baby ownership
    const baby = await db
      .select({ id: babies.id, userId: babies.userId, timezone: babies.timezone })
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);
    if (!baby.length || baby[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const timezone = baby[0].timezone ?? "UTC";

    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const remindersVisibilityEnd =
      endDate.getTime() < sevenDaysFromNow.getTime() ? endDate : sevenDaysFromNow;

    // Keep recurring reminder instances fresh for calendar ranges.
    await generateOccurrencesForActiveReminders({
      babyId,
    });

    // Fetch activities in range
    const acts = await db
      .select({
        id: activities.id,
        babyId: activities.babyId,
        startTime: activities.startTime,
        endTime: activities.endTime,
        notes: activities.notes,
        activityTypeId: activities.activityTypeId,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug, // (after you add slug)
        color: activityTypes.color,
        icon: activityTypes.icon,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(activities.babyId, babyId),
          gte(activities.startTime, startDate),
          lte(activities.startTime, endDate)
        )
      );

    // Fetch reminder occurrences in range (each daily/recurring instance)
    const rems = await db
      .select({
        id: reminderOccurrences.id,
        reminderId: reminders.id,
        babyId: reminders.babyId,
        scheduledFor: reminderOccurrences.scheduledFor,
        linkedActivityId: reminderOccurrences.linkedActivityId,
        reminderTitle: reminders.title,
        status: reminderOccurrences.status,
        activityTypeId: reminders.activityTypeId,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug,
        color: activityTypes.color,
        icon: activityTypes.icon,
      })
      .from(reminderOccurrences)
      .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
      .leftJoin(activityTypes, eq(reminders.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(reminders.babyId, babyId),
          gte(reminderOccurrences.scheduledFor, startDate),
          lte(reminderOccurrences.scheduledFor, remindersVisibilityEnd),
          inArray(reminderOccurrences.status, [
            "pending",
            "completed",
            "skipped",
            "expired",
          ])
        )
      );

    const todayKey = toDateKeyInTimezone(now, timezone);
    const filteredRems = rems.filter((row) => {
      // If completion already produced a linked activity, render only the activity
      // card to avoid duplicate reminder+activity cards for the same event.
      if (row.status === "completed" && row.linkedActivityId) {
        return false;
      }

      const rowKey = toDateKeyInTimezone(row.scheduledFor, timezone);
      const relation = compareDateKeys(rowKey, todayKey);

      // Past day: completed/skipped/expired
      if (relation < 0) {
        return (
          row.status === "completed" ||
          row.status === "skipped" ||
          row.status === "expired"
        );
      }

      // Today: completed/pending
      if (relation === 0) {
        return row.status === "completed" || row.status === "pending";
      }

      // Future day: pending only
      return row.status === "pending";
    });

    const events = [
      ...acts.map((a) => ({
        id: `activity:${a.id}`,
        type: "activity",
        sourceId: a.id,
        babyId: a.babyId,
        title: a.typeName ?? "Activity",
        start: a.startTime.toISOString(),
        end: a.endTime ? a.endTime.toISOString() : undefined,
        activityTypeId: a.activityTypeId,
        activityTypeSlug: a.typeSlug ?? undefined,
        color: a.color ?? undefined,
        icon: a.icon ?? undefined,
        notes: a.notes ?? undefined,
        dayKey: toDateKeyInTimezone(a.startTime, timezone),
      })),
      ...filteredRems.map((r) => ({
        id: `reminder:${r.id}`,
        type: "reminder",
        sourceId: r.reminderId,
        babyId: r.babyId,
        title: r.typeName ?? r.reminderTitle ?? "Reminder",
        start: r.scheduledFor?.toISOString(),
        activityTypeId: r.activityTypeId ?? undefined,
        activityTypeSlug: r.typeSlug ?? undefined,
        color: r.color ?? undefined,
        icon: r.icon ?? undefined,
        isActive: r.status === "pending",
        notes: null,
        status: r.status,
        dayKey: toDateKeyInTimezone(r.scheduledFor, timezone),
      })),
    ].filter((e) => Boolean(e.start));

    return NextResponse.json({
      timezone,
      events,
    });
  } catch (err) {
    console.error("GET /api/calendar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
