// src/lib/insights/dayInsights.ts

import type { InsightSeverity } from "./types";
import { UIInsight as Insight } from "./types";

type Input = {
  timeline: any[];
  stats: any;
  date?: Date;
};

export function generateDayInsights({
  timeline,
  stats,
  date,
}: Input): Insight[] {
  const insights: Insight[] = [];

  const activities = timeline.filter((e) => e.category === "activity");
  const reminders = timeline.filter((e) =>
    e.category.startsWith("reminder_")
  );

  const completedReminders = reminders.filter(
    (r) => r.category === "reminder_completed"
  );

  const skippedReminders = reminders.filter(
    (r) => r.category === "reminder_skipped"
  );

  const expiredReminders = reminders.filter(
    (r) => r.category === "reminder_expired"
  );

  const snoozedReminders = reminders.filter(
    (r) => r.category === "reminder_snoozed"
  );

  const triggeredReminders = reminders.filter(
    (r) => r.category === "reminder_triggered"
  );

  // =========================
  // 🔴 CRITICAL ALERTS
  // =========================

  if (activities.length === 0) {
    insights.push({
      type: "activity",
      title: "No activity logged",
      description: "Tracking activities unlocks insights and predictions",
      severity: "strong",
      actionLabel: "Log activity",
      timestamp: "Today",
    });
  }

  if ((stats?.overdueReminders ?? 0) > 0) {
    insights.push({
      type: "reminder",
      title: "Overdue reminders",
      description: `${stats.overdueReminders} reminders need attention`,
      severity: "strong",
      actionLabel: "Review now",
      timestamp: "Today",
      relatedId: reminders.find(r => r.category === "reminder_overdue")?.id,
    });
  }

  if (expiredReminders.length > 0) {
    insights.push({
      type: "reminder",
      title: "Reminders expired",
      description: "Some reminders were never completed",
      severity: "strong",
      timestamp: "Today",
      relatedId: expiredReminders[0]?.id,
    });
  }

  // =========================
  // 🟡 REMINDER BEHAVIOR
  // =========================

  if (skippedReminders.length >= 2) {
    insights.push({
      type: "reminder",
      title: "Frequent reminder skips",
      description: "Reminders may not match your schedule",
      severity: "warning",
      timestamp: "Today",
      relatedId: skippedReminders[0]?.id,
    });
  }

  if (snoozedReminders.length >= 3) {
    insights.push({
      type: "reminder",
      title: "Frequent snoozing",
      description: "You may need better reminder timing",
      severity: "warning",
      timestamp: "Today",
      relatedId: snoozedReminders[0]?.id,
    });
  }

  if (
    triggeredReminders.length > 0 &&
    completedReminders.length === 0
  ) {
    insights.push({
      type: "reminder",
      title: "Reminders ignored",
      description: "Reminders were triggered but not completed",
      severity: "warning",
      timestamp: "Today",
      relatedId:
        triggeredReminders[0]?.id ??
        reminders.find(r => r.category === "reminder_overdue")?.id,
    });
  }

  // =========================
  // 📊 COMPLETION ANALYSIS
  // =========================

  const completionRate = stats?.completionRate ?? 0;

  if (completionRate < 0.4) {
    insights.push({
      type: "reminder",
      title: "Very low completion rate",
      description: "Routine may need adjustment",
      severity: "strong",
      timestamp: "Today",
    });
  } else if (completionRate < 0.7) {
    insights.push({
      type: "reminder",
      title: "Moderate completion rate",
      description: "Some reminders were missed",
      severity: "warning",
      timestamp: "Today",
    });
  } else if (completionRate > 0.85) {
    insights.push({
      type: "reminder",
      title: "Excellent consistency",
      description: "Most reminders completed successfully",
      severity: "success",
      timestamp: "Today",
    });
  }

  // =========================
  // 🧠 ACTIVITY ANALYSIS
  // =========================

  if (activities.length > 10) {
    insights.push({
      type: "activity",
      title: "Highly active day",
      description: "Lots of activity recorded",
      severity: "success",
      timestamp: "Today",
    });
  }

  if (activities.length > 0 && activities.length < 3) {
    insights.push({
      type: "activity",
      title: "Low activity data",
      description: "More entries improve insights",
      severity: "info",
      timestamp: "Today",
    });
  }

  // =========================
  // ⏱ GAP DETECTION
  // =========================

  const sortedActivities = activities
    .filter((a) => a.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (sortedActivities.length >= 2) {
    const last = new Date(sortedActivities[0].at).getTime();
    const prev = new Date(sortedActivities[1].at).getTime();

    const gapMinutes = (last - prev) / (1000 * 60);

    if (gapMinutes > 300) {
      insights.push({
        type: "activity",
        title: "Long activity gap",
        description: "Unusual break between activities",
        severity: "warning",
        timestamp: "Today",
        relatedId: sortedActivities[0]?.id,
      });
    }
  }

  // =========================
  // 🧪 DATA QUALITY
  // =========================

  const incomplete = activities.filter(
    (a) => a.status !== "completed"
  ).length;

  if (incomplete > 0) {
    insights.push({
      type: "activity",
      title: "Incomplete activities",
      description: "Add duration or details to improve insights",
      severity: "warning",
      actionLabel: "Fix activities",
      timestamp: "Today",
      relatedId: activities.find(a => !a.endTime)?.id,
    });
  }


  // =========================
  // 🧠 RESPONSE TIME
  // =========================

  if (
    stats?.averageResponseTimeMinutes &&
    stats.averageResponseTimeMinutes > 20
  ) {
    insights.push({
      type: "reminder",
      title: "Slow response to reminders",
      description: "You take longer to respond than usual",
      severity: "warning",
      timestamp: "Today",
      relatedId: triggeredReminders[0]?.id,
    });
  }

  // =========================
  // 🟢 POSITIVE FEEDBACK
  // =========================

  if (
    completionRate > 0.9 &&
    skippedReminders.length === 0 &&
    expiredReminders.length === 0
  ) {
    insights.push({
      type: "reminder",
      title: "Perfect day",
      description: "All reminders completed without issues",
      severity: "success",
      timestamp: "Today",
    });
  }

  // =========================
  // 🧠 SMART ADVICE
  // =========================

  if (skippedReminders.length > 0 && completionRate < 0.5) {
    insights.push({
      type: "reminder",
      title: "Adjust your schedule",
      description: "Consider updating reminder timing",
      severity: "info",
      timestamp: "Today",
      relatedId: skippedReminders[0]?.id,
    });
  }

  // =========================
  // 🧠 SUMMARY (always first)
  // =========================

  const summary = generateSummary(insights);

  const priority: Record<InsightSeverity, number> = {
    critical: 5,
    strong: 4,
    warning: 3,
    info: 2,
    success: 1,
  };

  // ❗ sort WITHOUT summary interference
  const sorted = [...insights].sort((a, b) => {
    const kb = (b.severity ?? "info") as InsightSeverity;
    const ka = (a.severity ?? "info") as InsightSeverity;
    return priority[kb] - priority[ka];
  });

  // ❗ remove summary from body
  const body = dedupe(sorted).filter(i => i.type !== "summary");

  // ✅ ALWAYS keep summary on top
  return summary
    ? [
      { type: "summary", title: summary, severity: "info" },
      ...body.slice(0, 5),
    ]
    : body.slice(0, 6);
}
function generateSummary(insights: Insight[]) {
  const critical = insights.find(i => i.severity === "strong");
  if (critical) return `⚠️ Attention needed: ${critical.title}`;

  const warning = insights.find(i => i.severity === "warning");
  if (warning) return `⚠️ Watch out: ${warning.title}`;

  const success = insights.find(i => i.severity === "success");
  if (success) return `✅ Great job: ${success.title}`;

  return "Everything looks normal today";
}

function dedupe(insights: Insight[]) {
  const seen = new Set<string>();

  return insights.filter((i) => {
    const key = `${i.type}-${i.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}