export type InsightSeverity =
  | "success"
  | "info"
  | "warning"
  | "critical";

export interface DashboardInsight {
  id: string;
  category: "feeding" | "sleep" | "growth" | "reminder" | "diaper";
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}
