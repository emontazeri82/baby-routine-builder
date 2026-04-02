"use client";

import { useMemo } from "react";
import SmartInsightCard, { Insight } from "./SmartInsightCard";
import type { ReminderDTO } from "@/lib/reminders";

export default function ReminderInsights({
  reminders,
}: {
  reminders: ReminderDTO[];
}) {
  const insights = useMemo(() => {
    if (!reminders.length) return [];

    const now = new Date();

    // =========================
    // 🔍 DERIVED DATA
    // =========================

    const active = reminders.filter((r) => r.status === "active");

    const overdue = active.filter(
      (r) => r.currentState === "overdue"
    );

    const snoozed = active.filter(
      (r) =>
        r.currentState === "snoozed" ||
        (r.snoozedUntil && new Date(r.snoozedUntil) > now)
    );

    const upcomingTimes = active
      .map((r) => r.nextUpcomingAt ?? r.nextScheduleAt)
      .filter(Boolean)
      .map((d) => new Date(d as string | Date))
      .sort((a, b) => a.getTime() - b.getTime());

    const nextUpcoming = upcomingTimes[0];

    const totalCompleted = reminders.reduce(
      (acc, r) => acc + Number(r.completedOccurrences ?? 0),
      0
    );

    const totalPending = reminders.reduce(
      (acc, r) => acc + Number(r.pendingOccurrences ?? 0),
      0
    );

    const completionRate =
      totalCompleted + totalPending > 0
        ? Math.round(
            (totalCompleted / (totalCompleted + totalPending)) * 100
          )
        : 0;

    const todayCount = active.filter((r) => {
      const d = new Date(r.remindAt);
      return d.toDateString() === now.toDateString();
    });

    const result: Insight[] = [];

    // =========================
    // 🔴 CRITICAL
    // =========================

    if (overdue.length >= 3) {
      result.push({
        title: `${overdue.length} overdue reminders`,
        description: "Your schedule may be overloaded",
        severity: "strong",
      });
    } else if (overdue.length > 0) {
      result.push({
        title: `${overdue.length} reminder needs attention`,
        description: "Try completing or rescheduling",
        severity: "warning",
      });
    }

    // =========================
    // ⏰ UPCOMING
    // =========================

    if (nextUpcoming) {
      const diff = nextUpcoming.getTime() - now.getTime();

      if (diff > 0 && diff < 30 * 60 * 1000) {
        result.push({
          title: "Upcoming reminder soon",
          description: "Within the next 30 minutes",
          severity: "warning",
        });
      }
    }

    // =========================
    // 🟡 SNOOZE BEHAVIOR
    // =========================

    if (snoozed.length >= 3) {
      result.push({
        title: "Too many snoozed reminders",
        description: "You may be delaying important routines",
        severity: "warning",
      });
    }

    // =========================
    // 🟢 CONSISTENCY
    // =========================

    if (completionRate >= 80) {
      result.push({
        title: "Excellent consistency",
        description: `${completionRate}% completion rate`,
        severity: "success",
      });
    } else if (completionRate < 40) {
      result.push({
        title: "Low completion rate",
        description: "Consider simplifying your schedule",
        severity: "warning",
      });
    }

    // =========================
    // 📅 TODAY STRUCTURE
    // =========================

    if (todayCount.length === 0) {
      result.push({
        title: "No reminders today",
        description: "Consider adding structure to today",
        severity: "info",
      });
    }

    // =========================
    // 🧹 PRIORITY SORT
    // =========================

    const priority = {
      strong: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    return result.sort(
      (a, b) =>
        priority[a.severity ?? "info"] -
        priority[b.severity ?? "info"]
    );
  }, [reminders]);

  if (!insights.length) return null;

  return (
    <div className="space-y-2 sm:space-y-3">
      {insights.map((insight, i) => (
        <SmartInsightCard key={i} insight={insight} />
      ))}
    </div>
  );
}