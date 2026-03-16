import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  activities,
  activityTypes,
  babies,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";

const querySchema = z.object({
  babyId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

type TimelineEvent = {
  id: string;
  category:
    | "activity"
    | "reminder_completed"
    | "reminder_skipped"
    | "reminder_snoozed"
    | "reminder_expired"
    | "reminder_triggered";
  status: string;
  at: string;
  title: string;
  subtitle: string | null;
  source: "manual" | "reminder";
  reminderId?: string;
  occurrenceId?: string | null;
  scheduledFor?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  delayMinutes?: number | null;
  occurrenceStatus?: "pending" | "completed" | "skipped" | "expired";
  eventType?: string | null;
  metadata?: unknown;
  reminderOutcome?: "completed" | null;
};

function dayBoundsInTimezone(dateKey: string, timezone: string) {
  const start = fromZonedTime(`${dateKey}T00:00:00.000`, timezone);
  const end = fromZonedTime(`${dateKey}T23:59:59.999`, timezone);
  return { start, end };
}

function extractAmountMl(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const candidates = [
    record.amountMl,
    record.milliliters,
    record.totalMl,
    record.volumeMl,
    record.intakeMl,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function buildActivitySubtitle(params: {
  metadata: unknown;
  durationMinutes: number | null;
  notes: string | null;
  startTime: Date;
  endTime: Date | null;
}) {
  const parts: string[] = [];
  const amountMl = extractAmountMl(params.metadata);
  if (amountMl !== null) parts.push(`${amountMl} ml`);
  if (params.durationMinutes) parts.push(`Duration ${params.durationMinutes} min`);
  if (!params.durationMinutes && params.endTime) {
    const diff = Math.max(
      0,
      Math.round(
        (params.endTime.getTime() - params.startTime.getTime()) /
          60000
      )
    );
    if (diff > 0) parts.push(`Duration ${diff} min`);
  }
  if (params.notes) parts.push(params.notes);
  return parts.length ? parts.join(" • ") : null;
}

function buildTimelineEvents(params: {
  now: Date;
  activityRows: Array<{
    id: string;
    startTime: Date;
    endTime: Date | null;
    notes: string | null;
    metadata: unknown;
    durationMinutes: number | null;
    typeName: string;
    typeSlug: string | null;
    reminderId: string | null;
    linkedOccurrenceId: string | null;
  }>;
  occurrenceRows: Array<{
    id: string;
    reminderId: string;
    scheduledFor: Date;
    status: "pending" | "completed" | "skipped" | "expired";
    completedAt: Date | null;
    triggeredAt: Date | null;
    snoozeUntil: Date | null;
    reminderTitle: string | null;
    typeName: string | null;
    typeSlug: string | null;
  }>;
}) {
  const byOccurrence = new Map<string, (typeof params.activityRows)[number]>();
  const usedActivityIds = new Set<string>();
  for (const row of params.activityRows) {
    if (row.linkedOccurrenceId) {
      byOccurrence.set(row.linkedOccurrenceId, row);
    }
  }

  const events: TimelineEvent[] = [];

  for (const occ of params.occurrenceRows) {
    const linked = byOccurrence.get(occ.id);
    const base = occ.typeName ?? occ.reminderTitle ?? "Reminder";
    const completionTime = occ.completedAt ?? linked?.startTime ?? null;
    const delayMinutes =
      completionTime
        ? Math.round(
            (completionTime.getTime() - occ.scheduledFor.getTime()) /
              60000
          )
        : null;

    if (linked) {
      usedActivityIds.add(linked.id);
      events.push({
        id: `activity:${linked.id}`,
        category: "activity",
        status: "completed",
        at: linked.startTime.toISOString(),
        title: linked.typeName ?? base,
        subtitle: buildActivitySubtitle({
          metadata: linked.metadata,
          durationMinutes: linked.durationMinutes,
          notes: linked.notes,
          startTime: linked.startTime,
          endTime: linked.endTime,
        }),
        source: "reminder",
        reminderId: occ.reminderId,
        occurrenceId: occ.id,
        scheduledFor: occ.scheduledFor.toISOString(),
        completedAt: linked.startTime.toISOString(),
        skippedAt: null,
        delayMinutes,
        occurrenceStatus: occ.status,
        eventType: linked.typeSlug,
        metadata: linked.metadata,
        reminderOutcome: occ.status === "completed" ? "completed" : null,
      });
      continue;
    }

    if (occ.status === "completed") {
      events.push({
        id: `reminder-completed:${occ.id}`,
        category: "reminder_completed",
        status: "completed",
        at: completionTime?.toISOString() ?? occ.scheduledFor.toISOString(),
        title: `${base} reminder completed`,
        subtitle: null,
        source: "reminder",
        reminderId: occ.reminderId,
        occurrenceId: occ.id,
        scheduledFor: occ.scheduledFor.toISOString(),
        completedAt: completionTime?.toISOString() ?? null,
        skippedAt: null,
        delayMinutes,
        occurrenceStatus: occ.status,
        eventType: occ.typeSlug,
      });
      continue;
    }

    if (occ.status === "skipped") {
      events.push({
        id: `reminder-skipped:${occ.id}`,
        category: "reminder_skipped",
        status: "skipped",
        at: completionTime?.toISOString() ?? occ.scheduledFor.toISOString(),
        title: `${base} reminder skipped`,
        subtitle: null,
        source: "reminder",
        reminderId: occ.reminderId,
        occurrenceId: occ.id,
        scheduledFor: occ.scheduledFor.toISOString(),
        completedAt: null,
        skippedAt: completionTime?.toISOString() ?? null,
        delayMinutes,
        occurrenceStatus: occ.status,
        eventType: occ.typeSlug,
      });
      continue;
    }

    if (occ.status === "expired") {
      events.push({
        id: `reminder-expired:${occ.id}`,
        category: "reminder_expired",
        status: "expired",
        at: occ.scheduledFor.toISOString(),
        title: `${base} reminder expired`,
        subtitle: null,
        source: "reminder",
        reminderId: occ.reminderId,
        occurrenceId: occ.id,
        scheduledFor: occ.scheduledFor.toISOString(),
        completedAt: null,
        skippedAt: null,
        delayMinutes: null,
        occurrenceStatus: occ.status,
        eventType: occ.typeSlug,
      });
      continue;
    }

    if (occ.snoozeUntil && occ.snoozeUntil.getTime() > params.now.getTime()) {
      events.push({
        id: `reminder-snoozed:${occ.id}`,
        category: "reminder_snoozed",
        status: "snoozed",
        at: occ.scheduledFor.toISOString(),
        title: `${base} reminder snoozed`,
        subtitle: `Snoozed until ${occ.snoozeUntil.toLocaleTimeString()}`,
        source: "reminder",
        reminderId: occ.reminderId,
        occurrenceId: occ.id,
        scheduledFor: occ.scheduledFor.toISOString(),
        completedAt: null,
        skippedAt: null,
        delayMinutes: null,
        occurrenceStatus: occ.status,
        eventType: occ.typeSlug,
      });
      continue;
    }

    events.push({
      id: `reminder-triggered:${occ.id}`,
      category: "reminder_triggered",
      status: "pending",
      at: occ.scheduledFor.toISOString(),
      title: `${base} reminder triggered`,
      subtitle: null,
      source: "reminder",
      reminderId: occ.reminderId,
      occurrenceId: occ.id,
      scheduledFor: occ.scheduledFor.toISOString(),
      completedAt: null,
      skippedAt: null,
      delayMinutes: null,
      occurrenceStatus: occ.status,
      eventType: occ.typeSlug,
    });
  }

  for (const row of params.activityRows) {
    if (usedActivityIds.has(row.id)) continue;

    events.push({
      id: `activity:${row.id}`,
      category: "activity",
      status: "completed",
      at: row.startTime.toISOString(),
      title: row.typeName,
      subtitle: buildActivitySubtitle({
        metadata: row.metadata,
        durationMinutes: row.durationMinutes,
        notes: row.notes,
        startTime: row.startTime,
        endTime: row.endTime,
      }),
      source: row.linkedOccurrenceId ? "reminder" : "manual",
      reminderId: row.reminderId ?? undefined,
      occurrenceId: row.linkedOccurrenceId,
      scheduledFor: null,
      completedAt: row.startTime.toISOString(),
      skippedAt: null,
      delayMinutes: null,
      occurrenceStatus: undefined,
      eventType: row.typeSlug,
      metadata: row.metadata,
      reminderOutcome: row.linkedOccurrenceId ? "completed" : null,
    });
  }

  const priority: Record<TimelineEvent["category"], number> = {
    activity: 0,
    reminder_completed: 1,
    reminder_skipped: 2,
    reminder_snoozed: 3,
    reminder_expired: 4,
    reminder_triggered: 5,
  };

  const deduped = Array.from(
    new Map(
      events.map((event) => {
        const dedupeKey =
          event.occurrenceId && event.category !== "activity"
            ? `${event.category}:${event.occurrenceId}`
            : event.id;
        return [dedupeKey, event] as const;
      })
    ).values()
  );

  return deduped.sort((a, b) => {
    const timeDiff = new Date(b.at).getTime() - new Date(a.at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return priority[a.category] - priority[b.category];
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { babyId, date } = parsed.data;
  const now = new Date();

  const owned = await db
    .select({ id: babies.id, timezone: babies.timezone })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!owned.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timezone = owned[0].timezone ?? "UTC";
  const { start, end } = dayBoundsInTimezone(date, timezone);
  const effectiveEnd = end;

  const [activityRows, occurrenceRows, activeReminderRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        startTime: activities.startTime,
        endTime: activities.endTime,
        notes: activities.notes,
        metadata: activities.metadata,
        durationMinutes: activities.durationMinutes,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug,
        reminderId: reminderOccurrences.reminderId,
        linkedOccurrenceId: reminderOccurrences.id,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .leftJoin(
        reminderOccurrences,
        eq(reminderOccurrences.linkedActivityId, activities.id)
      )
      .where(
        and(
          eq(activities.babyId, babyId),
          gte(activities.startTime, start),
          lte(activities.startTime, effectiveEnd)
        )
      ),
    db
      .select({
        id: reminderOccurrences.id,
        reminderId: reminders.id,
        scheduledFor: reminderOccurrences.scheduledFor,
        status: reminderOccurrences.status,
        completedAt: reminderOccurrences.completedAt,
        triggeredAt: reminderOccurrences.triggeredAt,
        snoozeUntil: reminderOccurrences.snoozeUntil,
        reminderTitle: reminders.title,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug,
      })
      .from(reminderOccurrences)
      .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
      .leftJoin(activityTypes, eq(reminders.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(reminders.babyId, babyId),
          gte(reminderOccurrences.scheduledFor, start),
          lte(reminderOccurrences.scheduledFor, effectiveEnd)
        )
      ),
    db
      .select({ id: reminders.id })
      .from(reminders)
      .where(and(eq(reminders.babyId, babyId), eq(reminders.status, "active"))),
  ]);

  const timeline = buildTimelineEvents({
    now,
    activityRows,
    occurrenceRows,
  });

  const remindersCompleted = occurrenceRows.filter((o) => o.status === "completed").length;
  const remindersSkipped = occurrenceRows.filter((o) => o.status === "skipped").length;
  const remindersExpired = occurrenceRows.filter((o) => o.status === "expired").length;
  const remindersSnoozed = occurrenceRows.filter(
    (o) =>
      o.status === "pending" &&
      o.snoozeUntil !== null &&
      o.snoozeUntil.getTime() > now.getTime()
  ).length;
  const overdueReminders = occurrenceRows.filter(
    (o) =>
      o.status === "pending" &&
      o.scheduledFor.getTime() < now.getTime() &&
      (!o.snoozeUntil || o.snoozeUntil.getTime() <= now.getTime())
  ).length;
  const activityByType = activityRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.typeName] = (acc[row.typeName] ?? 0) + 1;
    return acc;
  }, {});
  const mostActiveActivityType = Object.entries(activityByType).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? null;
  const completionDenominator = remindersCompleted + remindersSkipped;
  const completionRate =
    completionDenominator > 0 ? remindersCompleted / completionDenominator : null;
  const responseDurations = occurrenceRows
    .filter((o) => o.status === "completed" && o.completedAt)
    .map((o) =>
      Math.max(0, (o.completedAt as Date).getTime() - o.scheduledFor.getTime())
    );
  const averageResponseTimeMinutes =
    responseDurations.length > 0
      ? Math.round(
          responseDurations.reduce((acc, value) => acc + value, 0) /
            responseDurations.length /
            60000
        )
      : null;

  const stats = {
    activitiesLogged: activityRows.length,
    remindersCompleted,
    remindersSkipped,
    remindersSnoozed,
    remindersExpired,
    overdueReminders,
    activeReminders: activeReminderRows.length,
    averageResponseTimeMinutes,
    completionRate,
    mostActiveActivityType,
  };

  return NextResponse.json({
    date,
    stats,
    timeline,
  });
}
