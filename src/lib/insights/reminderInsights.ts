import { DashboardInsight } from "./types";

export function generateReminderInsights(
  upcomingCount: number
): DashboardInsight[] {
  if (upcomingCount === 0) {
    return [
      {
        id: "reminder-no-reminders",
        category: "reminder",
        severity: "info",
        title: "No Upcoming Reminders",
        message: "You're all caught up!",
      },
    ];
  }

  if (upcomingCount > 5) {
    return [
      {
        id: "reminder-many-reminders",
        category: "reminder",
        severity: "warning",
        title: "Busy Schedule Ahead",
        message: `You have ${upcomingCount} reminders scheduled.`,
      },
    ];
  }

  return [];
}
