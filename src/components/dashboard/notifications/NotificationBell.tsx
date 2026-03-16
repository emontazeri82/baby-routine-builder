"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationDrawer from "./NotificationDrawer";
import { setNotifications } from "@/store/notificationSlice";

type InsightApiItem = {
  id: string
  category: string
  severity: "success" | "info" | "warning" | "critical"
  title: string
  message: string
  actionUrl: string | null
  createdAt: string
}

type NotificationApiItem = {
  id: string;
  reminderId: string;
  occurrenceId: string | null;
  activityTypeId: string | null;
  reminderStatus: "active" | "paused" | "cancelled" | null;
  scheduleType: "one-time" | "recurring" | "interval" | null;
  currentState:
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "completed"
  | "skipped"
  | "last_completed"
  | "last_skipped"
  | "upcoming"
  | null;
  hasDueOccurrence: boolean;
  dueOccurrenceCount: number;
  title: string | null;
  scheduledFor: string | null;
  status: string | null;
  readAt: string | null;
  createdAt: string | null;
  actionUrl: string | null;
  severity: string | null;
  errorMessage: string | null;
  attempts: number | null;
};

type NotificationApiResponse = {
  notifications: NotificationApiItem[];
  unreadCount: number;
};

export default function NotificationBell({
  babyId,
}: {
  babyId: string;
}) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const refreshNotifications = useCallback(async () => {
    try {
      const [notifRes, insightRes] = await Promise.all([
        fetch(`/api/notifications?babyId=${babyId}`, { cache: "no-store" }),
        fetch(`/api/insights?babyId=${babyId}`, { cache: "no-store" })
      ]);

      const notifData: NotificationApiResponse = notifRes.ok
        ? await notifRes.json()
        : { notifications: [], unreadCount: 0 };

      const insightPayload = insightRes.ok ? await insightRes.json() : [];
      const insightList: InsightApiItem[] = Array.isArray(insightPayload)
        ? insightPayload
        : (insightPayload?.insights ?? []);

      const insightNotifications = insightList.map(
        (i: InsightApiItem) => ({
          id: i.id,
          reminderId: undefined,
          occurrenceId: null,
          activityTypeId: null,
          reminderStatus: null,
          scheduleType: null,
          currentState: null,
          hasDueOccurrence: false,
          dueOccurrenceCount: 0,

          category: i.category ?? "insight",

          severity: i.severity,
          title: i.title,
          message: i.message,

          actionUrl: i.actionUrl ?? `/dashboard/${babyId}`,
          createdAt: i.createdAt,

          scheduledFor: undefined,
          status: undefined,
          attempts: undefined,
          errorMessage: null,

          readAt: null,
          isRead: false
        }));
      const mappedNotifications = notifData.notifications.map((n) => ({
        id: n.id,
        reminderId: n.reminderId,
        occurrenceId: n.occurrenceId,
        activityTypeId: n.activityTypeId,
        reminderStatus: n.reminderStatus,
        scheduleType: n.scheduleType,
        currentState: n.currentState,
        hasDueOccurrence: n.hasDueOccurrence,
        dueOccurrenceCount: n.dueOccurrenceCount,

        category: "reminder",

        severity:
          n.severity === "critical" ||
            n.severity === "warning" ||
            n.severity === "success" ||
            n.severity === "info"
            ? n.severity
            : "info",

        title: n.title ?? "Reminder notification",
        message: n.scheduledFor
          ? `Scheduled for ${new Date(n.scheduledFor).toLocaleString()}`
          : "Reminder update",

        actionUrl: n.actionUrl ?? `/dashboard/${babyId}/reminders`,
        createdAt: n.createdAt ?? undefined,
        scheduledFor: n.scheduledFor ?? undefined,

        status: n.status ?? undefined,
        attempts: n.attempts,
        errorMessage: n.errorMessage,

        readAt: n.readAt,
        isRead: Boolean(n.readAt)
      }));

      const merged = [...mappedNotifications, ...insightNotifications];

      merged.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      );
      dispatch(
        setNotifications({
          items: merged,
          unreadCount: notifData.unreadCount + insightNotifications.length
        })
      );
    } catch (error) {
      console.error("Failed to refresh notifications", error);
    }
  }, [babyId, dispatch]);

  useEffect(() => {
    const run = async () => {
      try {
        await fetch(`/api/insights/evaluate?babyId=${babyId}`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to evaluate insights", error);
      }

      void refreshNotifications();
    };

    void run();
  }, [babyId, refreshNotifications]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      void refreshNotifications();
    }, 25_000);
    return () => window.clearInterval(id);
  }, [open, refreshNotifications]);

  useEffect(() => {
    const onFocus = () => void refreshNotifications();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshNotifications]);

  const unreadCount = useAppSelector(
    (s) => s.notifications.unreadCount
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Open notifications"
        title="Notifications"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();

          void refreshNotifications();
          setOpen(true);
        }}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 animate-pulse"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationDrawer
        babyId={babyId}
        open={open}
        onOpenChange={setOpen}
        onRefresh={refreshNotifications}
      />
    </>
  );
}
