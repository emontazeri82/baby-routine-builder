"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { AppNotification } from "@/store/notificationSlice";
import { markAsRead } from "@/store/notificationSlice";
import { useReminderActions } from "@/hooks/useReminderActions";
import CompleteReminderPrompt from "@/components/reminders/CompleteReminderPrompt";

import {
  Bell,
  Moon,
  Baby,
  Activity,
  Clock,
  Sparkles,
  Lightbulb,
  BedSingle,
  Droplets,
  Gamepad2,
  Pill,
  Thermometer,
  Milk,
  TrendingUp
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  reminder: <Bell className="h-4 w-4" />,
  sleep: <Moon className="h-4 w-4" />,
  nap: <BedSingle className="h-4 w-4" />,
  feeding: <Baby className="h-4 w-4" />,
  pumping: <Milk className="h-4 w-4" />,
  diaper: <Activity className="h-4 w-4" />,
  bath: <Droplets className="h-4 w-4" />,
  play: <Gamepad2 className="h-4 w-4" />,
  medicine: <Pill className="h-4 w-4" />,
  temperature: <Thermometer className="h-4 w-4" />,
  growth: <TrendingUp className="h-4 w-4" />,
  routine: <Clock className="h-4 w-4" />,
  development: <Sparkles className="h-4 w-4" />,
  insight: <Lightbulb className="h-4 w-4 text-amber-500" />, // ADD THIS
};

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value == null) return "";
  return "[Invalid notification value]";
}

function extractErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return fallback;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.message === "string") return candidate.message;
  if (typeof candidate.error === "string") return candidate.error;
  if (
    candidate.error &&
    typeof candidate.error === "object" &&
    typeof (candidate.error as { message?: unknown }).message === "string"
  ) {
    return (candidate.error as { message: string }).message;
  }
  return fallback;
}

export default function NotificationItem({
  notification,
  babyId,
  onRefresh,
}: {
  notification: AppNotification;
  babyId: string;
  onRefresh?: () => Promise<void> | void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [actionLock, setActionLock] = useState(false);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    completeReminder,
    snoozeReminder,
    skipReminder,
    rescheduleReminder,
  } = useReminderActions();

  const severityStyles = {
    critical: "border-l-4 border-red-600 bg-red-50",
    warning: "border-l-4 border-amber-500 bg-amber-50",
    info: "border-l-4 border-blue-500 bg-blue-50",
    success: "border-l-4 border-green-500 bg-green-50",
  };

  const isReminderActive = notification.reminderStatus === "active";
  const hasOccurrence = Boolean(notification.occurrenceId);
  const canCompleteSkip = Boolean(
    isReminderActive &&
    hasOccurrence &&
    notification.hasDueOccurrence === true &&
    notification.currentState !== "completed" &&
    notification.currentState !== "skipped"
  );
  const canSnoozeOrReschedule = Boolean(
    isReminderActive && hasOccurrence
  );
  const isInsight = notification.category !== "reminder";
  const lifecycleLabel: Record<
    NonNullable<AppNotification["currentState"]>,
    string
  > = {
    cancelled: "Cancelled",
    overdue: "Overdue",
    snoozed: "Snoozed",
    completed: "Completed",
    skipped: "Skipped",
    last_completed: "Last completed",
    last_skipped: "Last skipped",
    upcoming: "Upcoming",
  };
  const lifecycleVariant: Record<
    NonNullable<AppNotification["currentState"]>,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    overdue: "destructive",
    snoozed: "secondary",
    upcoming: "outline",
    completed: "default",
    skipped: "secondary",
    last_completed: "outline",
    last_skipped: "outline",
    cancelled: "secondary",
  };

  function runQuickAction(action: () => Promise<{ ok: boolean; body: unknown }>) {
    if (!notification.reminderId || actionLock) return;

    startTransition(async () => {
      setError(null);
      setInfo("Updating reminder...");
      setActionLock(true);
      try {
        const result = await action();
        if (!result.ok) {
          const body = result.body;
          setError(extractErrorMessage(body, "Failed to run action"));
          setInfo(null);
          return;
        }

        const readRes = await fetch(`/api/notifications/${notification.id}/read`, {
          method: "PATCH",
        });
        if (readRes.ok) {
          dispatch(markAsRead(notification.id));
        }

        setInfo("Reminder updated.");
        if (onRefresh) await onRefresh();
        router.refresh();
      } catch {
        setError("Network error while running action.");
        setInfo(null);
      } finally {
        setActionLock(false);
      }
    });
  }

  function runCompleteOnly() {
    setShowCompletePrompt(false);
    if (!notification.reminderId) return;
    runQuickAction(() =>
      completeReminder(notification.reminderId!, {
        occurrenceId: notification.occurrenceId ?? undefined,
      })
    );
  }

  function openActivityThenComplete() {
    setShowCompletePrompt(false);
    if (!notification.reminderId) return;
    const returnTo = encodeURIComponent(`/dashboard/${babyId}/reminders`);
    const reminderTitle = encodeURIComponent(notification.title ?? "Reminder");
    const scheduledFor = encodeURIComponent(
      notification.scheduledFor ?? new Date().toISOString()
    );
    const occurrence = notification.occurrenceId
      ? `&occurrenceId=${notification.occurrenceId}`
      : "";

    router.push(
      `/dashboard/${babyId}/activities/new?fromReminder=1&completeAfterCreate=1&babyId=${babyId}&reminderId=${notification.reminderId}&reminderTitle=${reminderTitle}&title=${reminderTitle}&scheduledFor=${scheduledFor}&activityTypeId=${notification.activityTypeId ?? ""}${occurrence}&returnTo=${returnTo}`
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-md p-4 transition hover:bg-muted/60",
        severityStyles[notification.severity ?? "info"]
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-2">
          {categoryIcons[notification.category] ?? <Bell className="h-4 w-4" />}
          {asText(notification.title)}
        </p>
        <div className="flex items-center gap-2">
          {typeof notification.dueOccurrenceCount === "number" &&
            notification.dueOccurrenceCount > 1 && (
              <Badge variant="destructive">
                Due x{notification.dueOccurrenceCount}
              </Badge>
            )}
          {notification.currentState && (
            <Badge variant={lifecycleVariant[notification.currentState]}>
              {lifecycleLabel[notification.currentState]}
            </Badge>
          )}
          {isInsight && (
            <Badge variant="secondary" className="text-xs">
              Insight
            </Badge>
          )}
          <Badge variant={notification.isRead ? "outline" : "destructive"}>
            {notification.isRead ? "Read" : "Unread"}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {asText(notification.message)}
      </p>

      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        {notification.createdAt && (
          <p>
            Created{" "}
            {formatDistanceToNow(
              new Date(notification.createdAt),
              { addSuffix: true }
            )}
          </p>
        )}
        {notification.scheduledFor && (
          <p>Scheduled {format(new Date(notification.scheduledFor), "PPp")}</p>
        )}
      </div>

      {notification.actionUrl && (
        <Button
          asChild
          size="sm"
          variant="link"
          className="h-auto px-0 py-0"
        >
          <Link
            href={notification.actionUrl.replace(
              ":babyId",
              babyId
            )}
          >
            View →
          </Link>
        </Button>
      )}

      {notification.reminderId && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || actionLock || !canCompleteSkip}
            onClick={() => {
              if (notification.activityTypeId) {
                setShowCompletePrompt(true);
              } else {
                runQuickAction(() =>
                  completeReminder(notification.reminderId!, {
                    occurrenceId: notification.occurrenceId ?? undefined,
                  })
                );
              }
            }}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || actionLock || !canSnoozeOrReschedule}
            onClick={() =>
              runQuickAction(() =>
                snoozeReminder(notification.reminderId!, {
                  minutes: 10,
                  occurrenceId: notification.occurrenceId ?? undefined,
                })
              )
            }
          >
            Snooze 10m
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || actionLock || !canCompleteSkip}
            onClick={() =>
              runQuickAction(() => skipReminder(notification.reminderId!))
            }
          >
            Skip
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || actionLock || !canSnoozeOrReschedule}
            onClick={() =>
              runQuickAction(() =>
                rescheduleReminder(notification.reminderId!, {
                  remindAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                  occurrenceId: notification.occurrenceId ?? undefined,
                })
              )
            }
          >
            Reschedule +30m
          </Button>
        </div>
      )}

      {notification.status &&
        ["failed", "retrying", "permanently_failed"].includes(notification.status) && (
          <div className="space-y-0.5 text-[11px] text-muted-foreground">
            <p>
              Delivery status:{" "}
              {notification.status === "permanently_failed"
                ? "Permanently failed"
                : notification.status}
            </p>
            {typeof notification.attempts === "number" && (
              <p>Attempts: {notification.attempts}</p>
            )}
            {notification.errorMessage && <p>Error: {notification.errorMessage}</p>}
          </div>
        )}

      {notification.reminderId && !canCompleteSkip && isReminderActive && (
        <p className="text-[11px] text-muted-foreground">
          Complete/Skip become available when an occurrence is due.
        </p>
      )}
      {notification.reminderId && !isReminderActive && (
        <p className="text-[11px] text-muted-foreground">
          Reminder is not active.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && info && <p className="text-xs text-muted-foreground">{info}</p>}

      <CompleteReminderPrompt
        open={showCompletePrompt}
        disabled={isPending || actionLock}
        onCancel={() => setShowCompletePrompt(false)}
        onCompleteOnly={runCompleteOnly}
        onCreateActivity={openActivityThenComplete}
      />
    </div>
  );
}
