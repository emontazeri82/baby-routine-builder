import {
  getRecentlyOverdueReminders,
  getMissedCountLast7Days,
} from "@/services/reminder/detection/missed";
import type { AppNotification } from "@/store/notificationSlice";

export async function generateReminderNotifications(
  babyId: string,
  userId: string
): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];

  const recentlyOverdue = await getRecentlyOverdueReminders(
    babyId,
    userId
  );

  const missedCount = await getMissedCountLast7Days(
    babyId,
    userId
  );

  // ⚡ Immediate (Banner)
  if (recentlyOverdue.length > 0) {
    notifications.push({
      id: "reminder-overdue",
      category: "reminder",
      severity: "warning",
      title: "Reminder Overdue",
      message: `${recentlyOverdue.length} reminder(s) are overdue.`,
      actionUrl: `/dashboard/${babyId}/reminders`,
      createdAt: new Date().toISOString(),
      isRead: false,
    });
  }

  // 📊 Pattern (Insight-level)
  if (missedCount >= 5) {
    notifications.push({
      id: "reminder-critical",
      category: "reminder",
      severity: "critical",
      title: "High Reminder Miss Rate",
      message: `You missed ${missedCount} reminders this week.`,
      actionUrl: `/dashboard/${babyId}/reminders`,
      createdAt: new Date().toISOString(),
      isRead: false,
    });
  } else if (missedCount >= 3) {
    notifications.push({
      id: "reminder-warning",
      category: "reminder",
      severity: "warning",
      title: "Reminder Consistency Dropped",
      message: `${missedCount} reminders were missed this week.`,
      actionUrl: `/dashboard/${babyId}/reminders`,
      createdAt: new Date().toISOString(),
      isRead: false,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[NOTIF DEBUG][service:generateReminderNotifications]", {
      babyId,
      userId,
      recentlyOverdueCount: recentlyOverdue.length,
      missedCount,
      generatedCount: notifications.length,
      ids: notifications.map((n) => n.id),
    });
  }

  return notifications;
}
