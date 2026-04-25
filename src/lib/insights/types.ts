/* Shared insight / UI insight types */

export type InsightSeverity =
  | "success"
  | "info"
  | "warning"
  | "strong"
  | "critical";

/** Alias used by adapters and processors */
export type UIInsightSeverity = InsightSeverity;

export interface DashboardInsight {
  id: string;
  category:
    | "feeding"
    | "sleep"
    | "growth"
    | "reminder"
    | "diaper"
    | "play"
    | "bath"
    | "medicine"
    | "temperature"
    | "nap"
    | "pumping";
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;

  score?: number;        // ✅ ADD THIS
  createdAt?: Date;      // ✅ ADD (for recency scoring)
  confidence?: number;   // ✅ ADD (optional but powerful)
}

export type InsightCategory =
  | "feeding"
  | "sleep"
  | "growth"
  | "reminder"
  | "diaper"
  | "play"
  | "bath"
  | "medicine"
  | "temperature"
  | "nap"
  | "pumping";

export type UIInsightType =
  | "summary"
  | "critical"
  | "reminder"
  | "activity"
  | "behavior"
  | "completion"
  | "data_quality"
  | "advice"
  | "system";

/** Processor output consumed by assistant insight adapter */
export type InsightResult = {
  id?: string;
  type?: UIInsightType;
  category?: InsightCategory;
  title?: string;
  message: string;
  severity?: UIInsightSeverity;
  score?: number;
  babyId?: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt?: Date;
  expiresAt?: Date;
};

export type InsightModule = {
  key: string;
  triggers: ("activity" | "reminder" | "cron")[];
  activityTypes?: string[];
  evaluator: (
    babyId: string,
    context?: unknown
  ) => Promise<InsightResult[]>;
};

export type UIInsight = {
  id?: string;
  type?: UIInsightType;
  title: string;
  description?: string;
  severity?: UIInsightSeverity;
  score?: number;
  actionLabel?: string;
  onAction?: () => void;
  timestamp?: string;
  relatedId?: string;
  meta?: {
    activityTypeId?: string;
    activityTypeLabel?: string;
    activityTypeIcon?: string;
    minutesUntil?: number;
    isLaterToday?: boolean;
    scheduledClock?: string;
    urgencyLevel?: "normal" | "upcoming" | "soon" | "critical";
    reminderId?: string;
  };
};

export type DailySummaryStats = {
  activitiesLogged: number;
  pendingReminders: number;
  remindersSnoozed: number;
  overdueReminders: number;
  activeReminders: number;
  mostActiveActivityType: string | null;
  completionRate: number;
  averageResponseTimeMinutes: number;
};

export type TimelineEvent = {
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
    | "system_adjustment";
  at: string;
  reminderId?: string;
  occurrenceId?: string | null;
  title?: string;
  subtitle?: string | null;
  status?: string;
  adherenceType?: "on_time" | "late" | "missed" | "pending";
};

export type DayInsightsInput = {
  timeline: TimelineEvent[];
  stats: DailySummaryStats;
};
