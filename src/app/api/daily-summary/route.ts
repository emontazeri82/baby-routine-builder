import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  activities,
  activityTypes,
  babies,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";

import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";

import {
  computeReminderIntelligence,
  computeAdherenceMetrics,
  detectBehaviorPatterns,
  generateRecommendations,
} from "@/lib/reminderEngine/reminderIntelligence";

import { computeAdaptiveAdjustments } from "@/lib/reminderEngine/adaptiveEngine";

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
  | "reminder_triggered"
  | "reminder_upcoming"
  | "reminder_overdue"
  | "system_adjustment"
  status: string;
  at: string;
  title: string;
  subtitle: string | null;
  source: "manual" | "reminder" | "system";
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
  endTime?: string | null;
  adherenceType?: "on_time" | "late" | "missed" | "pending";
};

type UrgencyLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "none";

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
  function formatDuration(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  if (params.durationMinutes) {
    parts.push(formatDuration(params.durationMinutes));
  }
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
function getAdherenceType(params: {
  status: "pending" | "completed" | "skipped" | "expired";
  delayMinutes: number | null;
}): "on_time" | "late" | "missed" | "pending" {
  if (params.status === "pending") return "pending";

  if (params.status === "completed") {
    if (params.delayMinutes !== null && params.delayMinutes > 5) {
      return "late";
    }
    return "on_time";
  }

  return "missed"; // skipped or expired
}

function buildTimelineEvents(params: {
  now: Date;
  timezone: string;
  date: string;
  activityRows: Array<{
    id: string;
    startTime: Date;
    endTime: Date | null;
    notes: string | null;
    metadata: unknown;
    durationMinutes: number | null;
    typeName: string;
    typeSlug: string | null;
    dataCompleteness: string;
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
    const completionTime =
      occ.completedAt ??
      linked?.endTime ??   // ✅ FIX
      linked?.startTime ?? // fallback
      null;
    const delayMinutes =
      linked?.startTime
        ? Math.round(
          (linked.startTime.getTime() - occ.scheduledFor.getTime()) / 60000
        )
        : occ.completedAt
          ? Math.round(
            (occ.completedAt.getTime() - occ.scheduledFor.getTime()) / 60000
          )
          : null;

    if (linked) {
      usedActivityIds.add(linked.id);
      events.push({
        id: `activity:${linked.id}`,
        category: "activity",
        status: linked.dataCompleteness === "complete" ? "completed" : "partial",
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
        completedAt: linked.endTime?.toISOString() ?? null,
        endTime: linked.endTime?.toISOString() ?? null,
        skippedAt: null,
        delayMinutes,
        occurrenceStatus: occ.status,
        eventType: linked.typeSlug,
        metadata: linked.metadata,
        reminderOutcome: occ.status === "completed" ? "completed" : null,
        adherenceType: getAdherenceType({
          status: occ.status,
          delayMinutes,
        }),
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
        adherenceType: getAdherenceType({
          status: occ.status,
          delayMinutes,
        }),
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
        adherenceType: getAdherenceType({
          status: occ.status,
          delayMinutes,
        }),

      });
      continue;
    }

    if (occ.status === "expired") {
      const localDate = formatInTimeZone(
        occ.scheduledFor,
        params.timezone,
        "yyyy-MM-dd"
      );

      const today = formatInTimeZone(
        params.now,
        params.timezone,
        "yyyy-MM-dd"
      );

      if (localDate === today) {
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
          adherenceType: "missed",
        });
      }

      continue;
    }

    if (occ.snoozeUntil && occ.snoozeUntil.getTime() > params.now.getTime()) {
      events.push({
        id: `reminder-snoozed:${occ.id}`,
        category: "reminder_snoozed",
        status: "snoozed",
        at: occ.scheduledFor.toISOString(),
        title: `${base} reminder snoozed`,
        subtitle: `Snoozed until ${occ.snoozeUntil.toISOString()}`,
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

    // ✅ CASE 1: Actually triggered
    if (occ.triggeredAt) {
      events.push({
        id: `reminder-triggered:${occ.id}`,
        category: "reminder_triggered",
        status: "triggered",
        at: occ.triggeredAt.toISOString(),
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
      continue;
    }

    // ✅ CASE 2: Future pending (NOT triggered yet)
    if (occ.scheduledFor.getTime() > params.now.getTime()) {
      events.push({
        id: `reminder-upcoming:${occ.id}`,
        category: "reminder_upcoming", // or create "reminder_upcoming" later
        status: "upcoming",
        at: occ.scheduledFor.toISOString(),
        title: `${base} upcoming reminder`,
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
        adherenceType: "pending",
      });
      continue;
    }

    // ✅ CASE 3: Overdue pending
    events.push({
      id: `reminder-overdue:${occ.id}`,
      category: "reminder_overdue", // or "reminder_overdue"
      status: "overdue",
      at: occ.scheduledFor.toISOString(),
      title: `${base} reminder overdue`,
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
      adherenceType: "pending",
    });
  }

  for (const row of params.activityRows) {
    if (usedActivityIds.has(row.id)) continue;

    events.push({
      id: `activity:${row.id}`,
      category: "activity",
      status: row.dataCompleteness === "complete" ? "completed" : "partial",
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
      completedAt: row.endTime?.toISOString() ?? null,
      endTime: row.endTime?.toISOString() ?? null,
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
    reminder_overdue: 6,
    reminder_upcoming: 7,

    system_adjustment: 8, // ✅ ADD THIS
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
    return (priority[a.category] ?? 99) - (priority[b.category] ?? 99);
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

  // ✅ ADD HERE
  await generateOccurrencesForActiveReminders({
    babyId,
  });

  const [activityRows, activeReminderRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        startTime: activities.startTime,
        endTime: activities.endTime,
        notes: activities.notes,
        metadata: activities.metadata,
        durationMinutes: activities.durationMinutes,
        dataCompleteness: activities.dataCompleteness,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug,
        reminderId: reminderOccurrences.reminderId,
        linkedOccurrenceId: reminderOccurrences.id,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .leftJoin(
        reminderOccurrences,
        and(
          eq(reminderOccurrences.linkedActivityId, activities.id),
          gte(reminderOccurrences.scheduledFor, start),
          lte(reminderOccurrences.scheduledFor, effectiveEnd)
        )
      )
      .where(
        and(
          eq(activities.babyId, babyId),
          gte(activities.startTime, start),
          lte(activities.startTime, effectiveEnd)
        )
      ),

    db
      .select({ id: reminders.id })
      .from(reminders)
      .where(and(eq(reminders.babyId, babyId), eq(reminders.status, "active"))),
  ]);

  const occurrenceRowsRaw = await db
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
        eq(reminders.status, "active"),
        gte(reminderOccurrences.scheduledFor, start),
        lte(reminderOccurrences.scheduledFor, effectiveEnd)
      )
    )
    .limit(100);
  const occurrenceRows = occurrenceRowsRaw.filter(row => {
    const localDate = formatInTimeZone(
      row.scheduledFor,
      timezone,
      "yyyy-MM-dd"
    );

    return localDate === date;
  });
  console.log(
    "FILTER DEBUG",
    occurrenceRows.map(o => ({
      id: o.id,
      status: o.status,
      utc: o.scheduledFor,
      local: formatInTimeZone(o.scheduledFor, timezone, "yyyy-MM-dd"),
    }))
  );
  // 🧠 INTELLIGENCE LAYER
  const intelligence = computeReminderIntelligence({
    occurrences: occurrenceRows,
    now,
  });

  const metrics = computeAdherenceMetrics(occurrenceRows);

  const patterns = detectBehaviorPatterns(occurrenceRows, metrics);

  const recommendations = generateRecommendations({
    patterns,
    metrics,
  });
  const adjustments = computeAdaptiveAdjustments({
    occurrences: occurrenceRows,
  });

  // ✅ Use filtered data for timeline ONLY
  const timeline = buildTimelineEvents({
    now,
    timezone,
    date,
    activityRows,
    occurrenceRows, // ✅ FULL DATA
  });
  const nowISO = now.toISOString();
  for (const adj of adjustments) {
    timeline.push({
      id: `adjustment:${adj.reminderId}`,
      category: "system_adjustment",
      status: "suggested",
      at: nowISO,
      title: "Suggested schedule adjustment",
      subtitle: `Shift by ${adj.suggestedShiftMinutes} min`,
      source: "system",
      reminderId: adj.reminderId,
    });
  }
  console.log("RAW:", occurrenceRows.length);
  // ✅ SYSTEM-LEVEL pending (NOT filtered UI)
  const pendingOccurrences = occurrenceRows.filter(
    (o) => o.status === "pending"
  );

  const remindersSnoozed = pendingOccurrences.filter(
    (o) =>
      o.snoozeUntil !== null &&
      o.snoozeUntil.getTime() > now.getTime()
  ).length;

  const overdueReminders = pendingOccurrences.filter(
    (o) =>
      o.scheduledFor.getTime() < now.getTime() &&
      (!o.snoozeUntil || o.snoozeUntil.getTime() <= now.getTime())
  ).length;

  const activityByType = activityRows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.typeName] = (acc[row.typeName] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const mostActiveActivityType =
    Object.entries(activityByType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const uniqueActivities = new Set(activityRows.map((a) => a.id));
  // 🔥 NEXT REMINDER INTELLIGENCE

  const stats = {
    activitiesLogged: uniqueActivities.size,

    pendingReminders: pendingOccurrences.length,
    remindersSnoozed,
    overdueReminders,

    activeReminders: activeReminderRows.length,
    mostActiveActivityType,

    ...intelligence,
  };
  return NextResponse.json({
    date,
    stats,
    timeline,
    // 🧠 NEW LAYERS
    intelligence,
    metrics,
    patterns,
    recommendations,

    adjustments,
  });
}
