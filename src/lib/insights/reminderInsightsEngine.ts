// src/lib/insights/reminderInsights.ts

import { format } from "date-fns";
import { UIInsight } from "./types";
import { getActivityTypeDisplay } from "./activityTypeDisplay";
import { calculateScore } from "./utils/scoring";

const URGENT_WINDOW_MINUTES = 30;
const DUE_NOW_GRACE_MINUTES = 5;

type ReminderInsightInput = {
  reminders: {
    id: string;
    status: string;
    scheduleType?: string;
    remindAt?: string | Date | null;
    pendingOccurrences: number;
    completedOccurrences: number;
    skippedOccurrences: number;
    expiredOccurrences: number;
    nextDueAt?: string | Date | null;
    nextScheduleAt?: string | Date | null;
    nextUpcomingAt?: string | Date | null;
    snoozedUntil?: string | Date | null;
    currentState?: string;

    // ✅ SAFE ADD (optional, won't break anything)
    activityTypeId?: string;
    activityTypeName?: string | null;
    activityTypeSlug?: string | null;
    title?: string;

    history?: {
      completedAt?: string | Date;
      scheduledAt?: string | Date;
    }[];
  }[];
  date?: Date;
};

function parseInsightDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Keep the smart layer aligned with the reminder card:
 * - one-time reminders should use their original `remindAt`
 * - snoozed reminders should use `snoozedUntil`
 * - recurring/interval reminders can use `nextUpcomingAt` / `nextScheduleAt`
 */
function resolveEffectiveReminderTime(
  r: ReminderInsightInput["reminders"][number],
  now: Date
): Date | null {
  const snooze = parseInsightDate(r.snoozedUntil);
  if (snooze !== null && snooze.getTime() > now.getTime()) {
    return snooze;
  }

  if (r.scheduleType === "one-time" && r.status === "active") {
    return parseInsightDate(r.remindAt);
  }

  return (
    parseInsightDate(r.nextUpcomingAt) ||
    parseInsightDate(r.nextScheduleAt)
  );
}

function createInsight(
  data: UIInsight,
  now: Date,
  context?: {
    relatedTime?: string;
    dataPoints?: number;
  }
): UIInsight | null {
  if (
    context?.dataPoints !== undefined &&
    context.dataPoints < 2 &&
    data.type !== "critical" &&
    data.type !== "reminder"   // 🔥 THIS LINE FIXES EVERYTHING
  ) return null;
  const reminderSuffix =
    data.type === "reminder"
      ? `-${data.meta?.reminderId ?? "unknown"}-${context?.relatedTime ?? "no-time"}`
      : "";

  return {
    id: `${data.type}-${data.title}${reminderSuffix}`,
    ...data,
    score: calculateScore(data, {
      now,
      relatedTime: context?.relatedTime,
      dataPoints: context?.dataPoints,
    }),
  };
}

export function generateReminderInsights({
  reminders,
  date,
}: ReminderInsightInput): UIInsight[] {

  if (!reminders.length) {
    return [{
      id: "empty",
      type: "critical",
      title: "No reminders configured",
      severity: "info",
    }];
  }

  const now = date ?? new Date();

  const active = reminders.filter(r => r.status === "active");

  const overdue = active.filter((r) => {
    if (!r.pendingOccurrences || r.pendingOccurrences === 0) return false;

    const dueAt = parseInsightDate(
      r.nextDueAt ?? r.nextScheduleAt ?? r.nextUpcomingAt
    );

    if (!dueAt) return r.currentState === "overdue";

    return dueAt.getTime() < now.getTime();
  });

  const snoozed = active.filter((r) => {
    const snoozeUntil = parseInsightDate(r.snoozedUntil);

    return snoozeUntil !== null && snoozeUntil > now;
  });

  const totalCompleted = reminders.reduce((a, r) => a + Number(r.completedOccurrences ?? 0), 0);
  const totalSkipped = reminders.reduce((a, r) => a + Number(r.skippedOccurrences ?? 0), 0);
  const totalExpired = reminders.reduce((a, r) => a + Number(r.expiredOccurrences ?? 0), 0);
  const totalPending = reminders.reduce((a, r) => a + Number(r.pendingOccurrences ?? 0), 0);

  const totalAll = totalCompleted + totalPending + totalSkipped + totalExpired;
  const completionRate = totalAll > 0 ? totalCompleted / totalAll : 0;

  const result: UIInsight[] = [];

  // 🔴 CRITICAL
  if (overdue.length >= 3) {
    const relatedTime = parseInsightDate(
      overdue[0]?.nextScheduleAt ?? overdue[0]?.nextUpcomingAt
    )?.toISOString();

    const i = createInsight(
      {
        type: "critical",
        title: `${overdue.length} overdue reminders`,
        description: "Your schedule may be overloaded",
        severity: "strong",
      },
      now,
      {
        relatedTime,
        dataPoints: overdue.length,
      }
    );

    if (i) result.push(i);
  } else if (overdue.length > 0) {
    const relatedTime = parseInsightDate(
      overdue[0]?.nextScheduleAt ?? overdue[0]?.nextUpcomingAt
    )?.toISOString();

    const i = createInsight(
      {
        type: "critical",
        title: `${overdue.length} reminder needs attention`,
        description: "Try completing or rescheduling",
        severity: "warning",
      },
      now,
      {
        relatedTime,
        dataPoints: overdue.length,
      }
    );

    if (i) result.push(i);
  }
  // 🔥 SMART UPCOMING (UPGRADED)
  const upcomingReminders = active
    .map((r) => {
      const nextAt = resolveEffectiveReminderTime(r, now);
      if (!nextAt) return null;
      return {
        reminder: r,
        date: nextAt,
      };
    })
    .filter(
      (
        x
      ): x is { reminder: ReminderInsightInput["reminders"][number]; date: Date } =>
        Boolean(x)
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcomingWindow = upcomingReminders.filter(({ date }) => {
    const diff = date.getTime() - now.getTime();
    return (
      diff >= -DUE_NOW_GRACE_MINUTES * 60 * 1000 &&
      diff <= URGENT_WINDOW_MINUTES * 60 * 1000
    );
  });

  upcomingWindow.forEach(({ reminder, date }) => {
    const diff = date.getTime() - now.getTime();
    const minsRaw = Math.floor(diff / 60000);
    const mins = minsRaw <= 0 ? 0 : minsRaw;

    const display = getActivityTypeDisplay({
      name: reminder.activityTypeName ?? undefined,
      slug: reminder.activityTypeSlug ?? undefined,
    });

    const customTitle = reminder.title?.trim();
    const hasActivityType = Boolean(reminder.activityTypeId);
    const labelLower = display.label.toLowerCase();

    const activityHeadline = !hasActivityType
      ? `📌 ${customTitle ?? "Reminder"}`
      : customTitle && customTitle.toLowerCase() !== labelLower
        ? `${display.icon} ${display.label} · ${customTitle}`
        : `${display.icon} ${display.label}`;

    let title = "";
    let severity: "info" | "warning" | "strong" = "info";

    if (mins <= 0) {
      title = `${activityHeadline} — due now`;
      severity = "strong";
    } else if (mins <= 5) {
      title = `${activityHeadline} — in ${mins} min`;
      severity = "strong";
    } else if (mins <= 15) {
      title = `${activityHeadline} — in ${mins} min`;
      severity = "warning";
    } else {
      title = `${activityHeadline} — in ${mins} min`;
    }

    const scheduledClock = format(date, "p");
    const scheduledFull = format(date, "PPp");
    const description = reminder.scheduleType === "one-time"
      ? `Scheduled for ${scheduledFull}`
      : hasActivityType
        ? `${display.label} reminder · ${scheduledClock}`
        : `${customTitle ?? "Reminder"} · ${scheduledClock}`;

    const i = createInsight({
      type: "reminder",
      title,
      description,
      severity,
      meta: {
        activityTypeId: reminder.activityTypeId,
        activityTypeLabel: display.label,
        activityTypeIcon: display.icon,
        reminderId: reminder.id,
        minutesUntil: mins,
        scheduledClock,
        urgencyLevel:
          mins <= 0 ? "critical" : mins <= 5 ? "soon" : mins <= 15 ? "upcoming" : "normal",
      },
    }, now, {
      relatedTime: date.toISOString(),
      dataPoints: 2,
    });

    if (i) result.push(i);
  });



  // 📊 MISSED
  if (totalCompleted > 0 && totalSkipped + totalExpired > totalCompleted * 1.2) {
    const i = createInsight({
      type: "behavior",
      title: "Reminders often missed",
      description: "Many skipped or expired",
      severity: "warning",
    }, now, { dataPoints: totalAll });
    if (i) result.push(i);
  }

  // 🟡 SNOOZING
  if (snoozed.length >= 3) {
    const i = createInsight({
      type: "behavior",
      title: "Frequent snoozing",
      description: "You may be delaying routines",
      severity: "warning",
    }, now, { dataPoints: snoozed.length });
    if (i) result.push(i);
  }

  // 📊 COMPLETION
  if (completionRate >= 0.85) {
    const i = createInsight({
      type: "completion",
      title: "Excellent consistency",
      description: `${Math.round(completionRate * 100)}% completion`,
      severity: "success",
    }, now, { dataPoints: totalAll });
    if (i) result.push(i);
  } else if (completionRate < 0.4) {
    const i = createInsight({
      type: "completion",
      title: "Low completion rate",
      description: "You may be overloaded",
      severity: "warning",
    }, now, { dataPoints: totalAll });
    if (i) result.push(i);
  }

  // 📅 NO TODAY
  const todayReminders = active.filter((r) => {
    const next = resolveEffectiveReminderTime(r, now);

    if (!next) return false;

    return next.toDateString() === now.toDateString();
  });

  if (todayReminders.length === 0) {
    const i = createInsight({
      type: "advice",
      title: "No reminders today",
      description: "Consider adding structure",
      severity: "info",
    }, now, { dataPoints: 0 });
    if (i) result.push(i);
  }

  // ⚔️ CONFLICT
  const hasCritical = result.some(i => i.type === "critical");
  const filtered = hasCritical ? result.filter(i => i.severity !== "success") : result;

  // 🧠 GROUPING
  const grouped = Array.from(
    new Map(
      filtered.map((i) => {
        const key =
          i.type === "reminder"
            ? `${i.type}-${i.meta?.reminderId ?? i.id ?? i.title}-${i.meta?.minutesUntil ?? "na"}`
            : `${i.type}-${i.title}-${i.severity}`;
        return [key, i] as const;
      })
    ).values()
  );

  // 🧠 SORT
  const sorted = [...grouped].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const reminderOnly = sorted.filter((i) => i.type === "reminder");
  const nonReminderTop = sorted.filter((i) => i.type !== "reminder").slice(0, 5);
  const finalInsights = [...reminderOnly, ...nonReminderTop];

  const summaryText = generateSummary(finalInsights);

  const summary = createInsight({
    type: "summary",
    title: summaryText,
    severity: "info",
  }, now);

  return summary
    ? [summary, ...finalInsights]
    : finalInsights;
}

function generateSummary(insights: UIInsight[]) {
  const criticalCount = insights.filter(i => i.type === "critical").length;
  const warningCount = insights.filter(i => i.severity === "warning").length;
  const success = insights.find(i => i.severity === "success");

  if (criticalCount > 0) {
    return `⚠️ You have ${criticalCount} urgent reminder issues`;
  }

  if (warningCount > 0) {
    return `⚠️ Your reminders need attention`;
  }

  if (success) {
    return `✅ Great job staying consistent`;
  }

  return "Your reminders look balanced today";
}
