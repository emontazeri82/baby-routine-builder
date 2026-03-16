export type InsightSeverity =
  | "success"
  | "info"
  | "warning"
  | "critical";

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
}
export type InsightResult = {
  type: string
  message: string
  score?: number
  babyId: string
}
export type InsightModule = {
  key: string
  triggers: ("activity" | "reminder" | "cron")[]
  activityTypes?: string[]
  evaluator: (babyId: string, context?: any) => Promise<any>
}