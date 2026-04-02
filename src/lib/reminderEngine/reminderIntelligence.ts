// lib/reminderEngine/reminderIntelligence.ts

export type ReminderOccurrence = {
  id: string;
  reminderId: string;
  scheduledFor: Date;
  status: "pending" | "completed" | "skipped" | "expired";
  completedAt: Date | null;
  triggeredAt: Date | null;
  snoozeUntil: Date | null;
  delayMinutes?: number | null; // optional (can be injected later)
  typeSlug?: string | null;
};

export type UrgencyLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "none";

export type ReminderIntelligenceResult = {
  nextReminder: ReminderOccurrence | null;
  nextReminderAt: string | null;
  minutesUntilNextReminder: number;
  isOverdue: boolean;
  hasNextReminder: boolean;
  nextReminderLabel: string;

  urgencyLevel: UrgencyLevel;
  urgencyLabel: string;
  urgencyColor: string;
};

export type AdherenceMetrics = {
  total: number;
  completed: number;
  missed: number;

  completionRate: number;
  onTimeRate: number;
  lateRate: number;
  missedRate: number;
};

export type BehaviorPatterns = {
  frequentlyLate: boolean;
  highMissRate: boolean;
  consistentOnTime: boolean;
};

export type Recommendation = {
  type:
    | "schedule_adjustment"
    | "habit_improvement"
    | "positive_feedback";
  message: string;
};

//
// 🧠 CORE INTELLIGENCE ENGINE
//

export function computeReminderIntelligence(params: {
  occurrences: ReminderOccurrence[];
  now: Date;
}): ReminderIntelligenceResult {
  const { occurrences, now } = params;

  const pending = occurrences.filter((o) => o.status === "pending");

  const nextReminder =
    pending
      .filter(
        (o) =>
          !o.snoozeUntil ||
          o.snoozeUntil.getTime() <= now.getTime()
      )
      .sort(
        (a, b) =>
          a.scheduledFor.getTime() -
          b.scheduledFor.getTime()
      )[0] ?? null;

  const minutesUntilNextReminder = nextReminder
    ? Math.round(
        (nextReminder.scheduledFor.getTime() - now.getTime()) /
          60000
      )
    : 0;

  const hasNextReminder = !!nextReminder;

  const isOverdue = nextReminder
    ? nextReminder.scheduledFor.getTime() < now.getTime()
    : false;

  const nextReminderAt = nextReminder
    ? nextReminder.scheduledFor.toISOString()
    : null;

  const nextReminderLabel = !hasNextReminder
    ? "No upcoming reminders"
    : isOverdue
    ? `Overdue by ${Math.abs(minutesUntilNextReminder)} min`
    : `In ${minutesUntilNextReminder} min`;

  const {
    urgencyLevel,
    urgencyLabel,
    urgencyColor,
  } = computeUrgency({
    minutesUntilNextReminder,
    isOverdue,
    hasNextReminder,
  });

  return {
    nextReminder,
    nextReminderAt,
    minutesUntilNextReminder,
    isOverdue,
    hasNextReminder,
    nextReminderLabel,

    urgencyLevel,
    urgencyLabel,
    urgencyColor,
  };
}

//
// ⚡ URGENCY ENGINE
//

export function computeUrgency(params: {
  minutesUntilNextReminder: number;
  isOverdue: boolean;
  hasNextReminder: boolean;
}): {
  urgencyLevel: UrgencyLevel;
  urgencyLabel: string;
  urgencyColor: string;
} {
  const { minutesUntilNextReminder, isOverdue, hasNextReminder } = params;

  let urgencyLevel: UrgencyLevel = "none";

  if (!hasNextReminder) {
    urgencyLevel = "none";
  } else if (isOverdue) {
    urgencyLevel = "critical";
  } else if (minutesUntilNextReminder <= 5) {
    urgencyLevel = "high";
  } else if (minutesUntilNextReminder <= 15) {
    urgencyLevel = "medium";
  } else {
    urgencyLevel = "low";
  }

  const urgencyLabel =
    urgencyLevel === "critical"
      ? "Immediate attention needed"
      : urgencyLevel === "high"
      ? "Starting very soon"
      : urgencyLevel === "medium"
      ? "Coming up"
      : urgencyLevel === "low"
      ? "Scheduled later"
      : "No reminders";

  const urgencyColor =
    urgencyLevel === "critical"
      ? "red"
      : urgencyLevel === "high"
      ? "orange"
      : urgencyLevel === "medium"
      ? "yellow"
      : urgencyLevel === "low"
      ? "green"
      : "gray";

  return {
    urgencyLevel,
    urgencyLabel,
    urgencyColor,
  };
}

//
// 📊 ADHERENCE METRICS ENGINE
//

export function computeAdherenceMetrics(
  occurrences: ReminderOccurrence[]
): AdherenceMetrics {
  const total = occurrences.length;

  const completed = occurrences.filter(
    (o) => o.status === "completed"
  );

  const missed = occurrences.filter(
    (o) => o.status === "skipped" || o.status === "expired"
  );

  const onTime = completed.filter(
    (o) =>
      o.delayMinutes !== null &&
      o.delayMinutes !== undefined &&
      o.delayMinutes <= 5
  ).length;

  const late = completed.filter(
    (o) =>
      o.delayMinutes !== null &&
      o.delayMinutes !== undefined &&
      o.delayMinutes > 5
  ).length;

  return {
    total,
    completed: completed.length,
    missed: missed.length,

    completionRate: total ? completed.length / total : 0,
    onTimeRate: completed.length ? onTime / completed.length : 0,
    lateRate: completed.length ? late / completed.length : 0,
    missedRate: total ? missed.length / total : 0,
  };
}

//
// 🔍 BEHAVIOR PATTERN DETECTION
//

export function detectBehaviorPatterns(
  occurrences: ReminderOccurrence[],
  metrics: AdherenceMetrics
): BehaviorPatterns {
  const lateCount = occurrences.filter(
    (o) =>
      o.delayMinutes !== null &&
      o.delayMinutes !== undefined &&
      o.delayMinutes > 10
  ).length;

  const frequentlyLate = lateCount >= 3;

  const highMissRate = metrics.missedRate > 0.4;

  const consistentOnTime = metrics.onTimeRate > 0.8;

  return {
    frequentlyLate,
    highMissRate,
    consistentOnTime,
  };
}

//
// 💡 RECOMMENDATION ENGINE
//

export function generateRecommendations(params: {
  patterns: BehaviorPatterns;
  metrics: AdherenceMetrics;
}): Recommendation[] {
  const { patterns, metrics } = params;

  const recommendations: Recommendation[] = [];

  if (patterns.frequentlyLate) {
    recommendations.push({
      type: "schedule_adjustment",
      message:
        "You are frequently late. Consider shifting reminders slightly later.",
    });
  }

  if (patterns.highMissRate) {
    recommendations.push({
      type: "habit_improvement",
      message:
        "Many reminders are being missed. Try simplifying your schedule.",
    });
  }

  if (patterns.consistentOnTime) {
    recommendations.push({
      type: "positive_feedback",
      message:
        "Great job! You are consistently completing reminders on time.",
    });
  }

  if (metrics.completionRate < 0.5) {
    recommendations.push({
      type: "habit_improvement",
      message:
        "Less than half of reminders are completed. Consider adjusting frequency.",
    });
  }

  return recommendations;
}