"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useReminderActions } from "@/hooks/useReminderActions";
import { cn } from "@/lib/utils";

type ScheduleMetadata = {
  type: "daily" | "weekly" | "custom" | "interval";
  hour: number;
  minute: number;
  daysOfWeek?: number[];
  intervalMinutes?: number;
};

type Reminder = {
  id: string;
  babyId: string;
  activityTypeId: string | null;
  occurrenceId?: string | null;
  title: string | null;
  description: string | null;
  scheduleType: "one-time" | "recurring" | "interval";
  status: "active" | "paused" | "cancelled";
  remindAt: Date | string;
  cronExpression: string | null;
  repeatIntervalMinutes: number | null;
  allowSnooze?: boolean | null;

  currentState:
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "completed"
  | "skipped"
  | "last_completed"
  | "last_skipped"
  | "upcoming";

  nextUpcomingAt: Date | string | null;
  nextScheduleAt: Date | string | null;
  dueScheduledFor?: Date | string | null;
  lastScheduledFor?: Date | string | null;

  overdueCount: number;
  hasDueOccurrence: boolean;

  pendingOccurrences: number;
  completedOccurrences: number;
  skippedOccurrences: number;
  expiredOccurrences: number;

  lastResolvedAt: Date | string | null;
  lastCompletedAt: Date | string | null;
  snoozedUntil: Date | string | null;

  tags: unknown;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalDateTimeInputValue(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toWallClockIso(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      0,
      0
    )
  ).toISOString();
}



function formatTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatZonedDateTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "PPp");
}

function formatZonedTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "p");
}

function getReminderDisplayTimezone(timezone: string) {
  return timezone;
}

function buildBaseScheduleLabel(reminder: Reminder, timezone: string) {
  const meta = getScheduleMetadata(reminder.tags);
  const remindAt = parseValidDate(reminder.remindAt);
  const displayTimezone = getReminderDisplayTimezone(timezone);

  if (reminder.scheduleType === "one-time") {
    return remindAt
      ? `One-time at ${formatZonedDateTime(remindAt, displayTimezone)}`
      : "One-time reminder";
  }

  if (reminder.scheduleType === "interval") {
    const minutes = meta?.intervalMinutes ?? reminder.repeatIntervalMinutes;
    return minutes ? `Every ${minutes} minutes` : "Repeats by interval";
  }

  if (!meta) return "Recurring schedule";

  if (meta.type === "daily") {
    return `Daily at ${formatTime(meta.hour, meta.minute)}`;
  }

  if (meta.type === "weekly") {
    const days = (meta.daysOfWeek ?? []).map((d) => dayNames[d]).join(", ");
    return days
      ? `${days} at ${formatTime(meta.hour, meta.minute)}`
      : `Weekly at ${formatTime(meta.hour, meta.minute)}`;
  }

  const days = (meta.daysOfWeek ?? []).map((d) => dayNames[d]).join(", ");
  return days
    ? `${days} at ${formatTime(meta.hour, meta.minute)}`
    : `Custom at ${formatTime(meta.hour, meta.minute)}`;
}


function getScheduleMetadata(tags: unknown): ScheduleMetadata | null {
  if (!tags || typeof tags !== "object") return null;

  const meta = (tags as Record<string, unknown>).scheduleMetadata;

  if (!meta || typeof meta !== "object") return null;

  const candidate = meta as Partial<ScheduleMetadata>;

  if (typeof candidate.hour !== "number" || typeof candidate.minute !== "number")
    return null;

  if (
    candidate.type !== "daily" &&
    candidate.type !== "weekly" &&
    candidate.type !== "custom" &&
    candidate.type !== "interval"
  ) {
    return null;
  }

  return {
    type: candidate.type,
    hour: candidate.hour,
    minute: candidate.minute,
    daysOfWeek: Array.isArray(candidate.daysOfWeek)
      ? candidate.daysOfWeek.filter((d): d is number => typeof d === "number")
      : undefined,
    intervalMinutes:
      typeof candidate.intervalMinutes === "number"
        ? candidate.intervalMinutes
        : undefined,
  };
}



function buildScheduleLabel(reminder: Reminder, timezone: string) {
  const meta = getScheduleMetadata(reminder.tags);
  const remindAt = parseValidDate(reminder.remindAt);
  const displayTimezone = getReminderDisplayTimezone(timezone);
  const isOverdue =
    reminder.currentState === "overdue" ||
    reminder.hasDueOccurrence ||
    reminder.overdueCount > 0;

  if (isOverdue) {
    return reminder.scheduleType === "one-time"
      ? "Missed reminder"
      : buildBaseScheduleLabel(reminder, timezone); // keep pattern
  }
  const effectiveNext = reminder.nextScheduleAt ?? reminder.nextUpcomingAt;

  if (reminder.scheduleType === "one-time") {
    return remindAt
      ? `One-time at ${formatZonedDateTime(remindAt, displayTimezone)}`
      : "One-time reminder";
  }

  if (reminder.scheduleType === "interval") {
    const minutes = meta?.intervalMinutes ?? reminder.repeatIntervalMinutes;

    if (minutes) return `Every ${minutes} minutes`;

    return "Repeats by interval";
  }

  if (!meta) {
    if (effectiveNext) {
      const txt = formatDistanceToNow(new Date(effectiveNext), {
        addSuffix: true,
      });

      return `Recurring, next occurrence ${txt}`;
    }

    if (reminder.cronExpression) return "Recurring schedule configured";

    return "Recurring schedule";
  }

  if (meta.type === "daily") {
    return `Daily at ${formatTime(meta.hour, meta.minute)}`;
  }

  if (meta.type === "weekly") {
    const days = (meta.daysOfWeek ?? []).map((d) => dayNames[d]).join(", ");

    return days
      ? `${days} at ${formatTime(meta.hour, meta.minute)}`
      : `Weekly at ${formatTime(meta.hour, meta.minute)}`;
  }

  const days = (meta.daysOfWeek ?? []).map((d) => dayNames[d]).join(", ");

  return days
    ? `${days} at ${formatTime(meta.hour, meta.minute)}`
    : `Custom at ${formatTime(meta.hour, meta.minute)}`;
}



function extractErrorMessage(body: unknown, fallback: string) {
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



function getLifecycleMessage(reminder: Reminder, timezone: string) {
  const now = new Date();
  const scheduleType = reminder.scheduleType;
  const displayTimezone = getReminderDisplayTimezone(timezone);

  const snoozedUntil = reminder.snoozedUntil
    ? new Date(reminder.snoozedUntil)
    : null;

  const lastCompleted = reminder.lastCompletedAt
    ? new Date(reminder.lastCompletedAt)
    : null;

  const lastResolved = reminder.lastResolvedAt
    ? new Date(reminder.lastResolvedAt)
    : null;

  if (reminder.occurrenceId) {
    return "Action needed now. Complete or skip the due occurrence.";
  }

  if (reminder.overdueCount > 0) {
    return "Missed occurrences exist, but none require action.";
  }

  if (snoozedUntil && snoozedUntil > now) {
    return `Snoozed until ${formatZonedDateTime(snoozedUntil, displayTimezone)}.`;
  }

  if (lastCompleted) {
    return `Occurrence completed on ${formatZonedDateTime(lastCompleted, displayTimezone)}.`;
  }
  if (reminder.scheduleType === "one-time") {
    if (reminder.currentState === "upcoming") {
      return `Scheduled for ${formatZonedDateTime(
        new Date(reminder.remindAt),
        displayTimezone
      )}.`;
    }

    if (reminder.currentState === "overdue") {
      return "This reminder was missed.";
    }

    return null;
  }
  if (lastResolved && reminder.skippedOccurrences > 0) {
    return `Occurrence skipped on ${formatZonedDateTime(lastResolved, displayTimezone)}.`;
  }

  // ❌ DO NOT show next occurrence for one-time
  if (
    scheduleType === "recurring" || scheduleType === "interval"
  ) {
    const next = parseValidDate(reminder.nextScheduleAt);

    if (reminder.pendingOccurrences > 0 && next) {
      return `Next occurrence: ${formatZonedDateTime(next, displayTimezone)}.`;
    }
  }

  return null;
}

type Props = {
  reminder: Reminder;
  timezone: string;
};

export default function ReminderCard({ reminder, timezone }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  const [rescheduleAt, setRescheduleAt] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);

  const [isPending, startTransition] = useTransition();
  const hasOverdue =
    reminder.currentState === "overdue" ||
    reminder.hasDueOccurrence ||
    reminder.overdueCount > 0;
  const displayTimezone = getReminderDisplayTimezone(timezone);

  const router = useRouter();

  const {
    completeReminder,
    snoozeReminder,
    skipReminder,
    rescheduleReminder,
    updateReminderStatus,
    deleteReminder,
  } = useReminderActions();



  const dates = useMemo(() => {
    const nextSchedule = parseValidDate(reminder.nextScheduleAt);
    const nextUpcoming = parseValidDate(reminder.nextUpcomingAt);
    const nextCandidate = nextSchedule ?? nextUpcoming;

    const dueScheduledRaw = parseValidDate(reminder.dueScheduledFor ?? null);
    const lastScheduledRaw = parseValidDate(reminder.lastScheduledFor ?? null);

    const now = new Date();

    return {
      nextUpcoming: nextCandidate,

      nextUpcomingFuture:
        nextCandidate && nextCandidate.getTime() > now.getTime()
          ? nextCandidate
          : null,

      snoozedUntil: parseValidDate(reminder.snoozedUntil),

      dueScheduledFor:
        dueScheduledRaw ??
        (lastScheduledRaw && lastScheduledRaw.getTime() <= now.getTime()
          ? lastScheduledRaw
          : null),
    };
  }, [
    reminder.dueScheduledFor,
    reminder.nextScheduleAt,
    reminder.nextUpcomingAt,
    reminder.snoozedUntil,
    reminder.lastScheduledFor,
  ]);

  /*const isDue = useMemo(() => {
    if (reminder.status !== "active") return false;

    if (reminder.hasDueOccurrence) return true;

    if (!dates.nextUpcoming) return false;

    return dates.nextUpcoming.getTime() <= now.getTime();
  }, [reminder.status, reminder.hasDueOccurrence, dates.nextUpcoming, now]);*/


  const scheduleLabel = useMemo(
    () => buildScheduleLabel(reminder, timezone),
    [reminder, timezone]
  );


  const lifecycleMessage = getLifecycleMessage(reminder, timezone);



  const nextUpcomingRelative = dates.nextUpcomingFuture
    ? formatDistanceToNow(dates.nextUpcomingFuture, { addSuffix: true })
    : null;

  const safeActionable =
    reminder.status === "active" &&
    reminder.hasDueOccurrence &&
    !!reminder.occurrenceId;

  function toggleStatus(nextChecked: boolean) {
    startTransition(async () => {
      setActionError(null);
      setActionInfo(null);

      try {
        const result = await updateReminderStatus(
          reminder.id,
          nextChecked ? "active" : "paused"
        );

        if (!result.ok) {
          setActionError(
            extractErrorMessage(result.body, "Failed to update status")
          );
          return;
        }

        setActionInfo(nextChecked ? "Reminder resumed." : "Reminder paused.");

        setTimeout(() => router.refresh(), 1200);
      } catch {
        setActionError("Network error while updating reminder status.");
      }
    });
  }



  function runAction(
    action: () => Promise<{ ok: boolean; body: unknown }>,
    successMessage?: string
  ) {
    if (isPending) return;

    startTransition(async () => {
      setActionError(null);
      setActionInfo(null);

      try {
        const result = await action();

        if (!result.ok) {
          setActionError(
            extractErrorMessage(result.body, "Reminder action failed")
          );
          return;
        }

        if (successMessage) setActionInfo(successMessage);

        setShowReschedule(false);
        setRescheduleAt("");

        // ✅ 🔥 KEY FIX
        if (reminder.scheduleType === "one-time") {
          // 🧹 remove immediately (archived behavior)
          router.refresh();
          return;
        }

        // 🔁 recurring → let backend generate next occurrence first
        setTimeout(() => {
          router.refresh();
        }, 400);

      } catch {
        setActionError("Network error while running reminder action.");
      }
    });
  }

  function onSaveReschedule() {
    if (!rescheduleAt) return;

    const date = new Date(rescheduleAt);

    if (Number.isNaN(date.getTime())) {
      setActionError("Please select a valid reschedule date/time.");
      return;
    }

    if (date <= new Date()) {
      setActionError("Reschedule time must be in the future.");
      return;
    }

    runAction(
      () =>
        rescheduleReminder(reminder.id, {
          remindAt: toWallClockIso(date),
          timezone,
        }),
      "Occurrence rescheduled."
    );
  }
  const meta = useMemo(
    () => getScheduleMetadata(reminder.tags),
    [reminder.tags]
  );
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden border border-border/60",
          "bg-gradient-to-b from-background to-muted/30",
          "p-5 transition-all duration-200",
          "hover:shadow-xl hover:-translate-y-[2px]"
        )}
      >
        {/* 🔥 LEFT ACCENT BAR */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1",
            reminder.currentState === "overdue"
              ? "bg-red-500"
              : reminder.status === "active"
                ? "bg-blue-500"
                : "bg-gray-300"
          )}
        />

        <div className="flex items-start justify-between gap-4">

          {/* LEFT CONTENT */}
          <div className="space-y-2">

            {/* 🔥 TITLE ROW */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* status dot */}
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  reminder.currentState === "overdue"
                    ? "bg-red-500"
                    : reminder.status === "active"
                      ? "bg-green-500"
                      : "bg-gray-400"
                )}
              />

              <h3 className="text-lg font-semibold tracking-tight">
                {reminder.title || "Reminder"}
              </h3>

              {/* 🔥 IMPORTANT BADGES ONLY */}
              {reminder.currentState === "overdue" && (
                <Badge className="bg-red-100 text-red-600 border-red-200">
                  Overdue
                </Badge>
              )}

              <Badge
                variant={reminder.status === "active" ? "success" : "secondary"}
                className="capitalize"
              >
                {reminder.status}
              </Badge>

              <Badge variant="outline" className="capitalize text-xs opacity-70">
                {reminder.scheduleType}
              </Badge>
            </div>

            {/* 🔥 SCHEDULE */}
            <p className="text-sm text-muted-foreground">
              {scheduleLabel}
            </p>

            {/* 🔥 PRIMARY SIGNAL */}
            {hasOverdue && reminder.occurrenceId ? (
              <div className="space-y-1">
                {dates.dueScheduledFor && (
                  <p className="text-xs text-red-500">
                    Last due {formatZonedDateTime(dates.dueScheduledFor, displayTimezone)} •{" "}
                    {formatDistanceToNow(dates.dueScheduledFor, { addSuffix: true })}
                  </p>
                )}
                <p className="text-sm font-medium text-red-600">
                  Action required now
                </p>
              </div>
            ) : (
              reminder.scheduleType !== "one-time" &&
              dates.nextUpcomingFuture &&
              meta &&
              nextUpcomingRelative && (
                <p className="text-sm text-neutral-500">
                  Next: {nextUpcomingRelative} ({formatZonedTime(dates.nextUpcomingFuture, displayTimezone)})
                </p>
              )
            )}

            {/* 🔥 SOFT STATS (BALANCED) */}
            <div className="flex gap-2 text-xs pt-1">
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Pending {reminder.pendingOccurrences}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Done {reminder.completedOccurrences}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Skipped {reminder.skippedOccurrences}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Expired {reminder.expiredOccurrences}
              </span>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-60 hover:opacity-100"
              disabled={isPending || reminder.status === "cancelled"}
              onClick={() =>
                runAction(
                  () => deleteReminder(reminder.id),
                  "Reminder deleted."
                )
              }
            >
              <X className="h-4 w-4" />
            </Button>

            <Switch
              checked={reminder.status === "active"}
              onCheckedChange={toggleStatus}
              disabled={isPending || reminder.status === "cancelled"}
            />
          </div>
        </div>

        {/* 🔥 ACTION SECTION (ANIMATED) */}
        {reminder.status === "active" && safeActionable && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3"
          >
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                const occurrenceId = reminder.occurrenceId;
                if (!occurrenceId) {
                  setActionError("This reminder has no actionable occurrence.");
                  return;
                }

                runAction(
                  () =>
                    completeReminder(reminder.id, {
                      occurrenceId,
                      autoCreateActivity: true,
                    }),
                  reminder.scheduleType === "one-time"
                    ? "Completed & archived"
                    : "Completed — next occurrence scheduled"
                );
              }}
            >
              Complete
            </Button>

            {reminder.allowSnooze !== false && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () =>
                      snoozeReminder(reminder.id, {
                        minutes: 10,
                        occurrenceId: reminder.occurrenceId!,
                      }),
                    "Occurrence snoozed for 10 minutes."
                  )
                }
              >
                Snooze
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                if (!reminder.occurrenceId) {
                  setActionError("No due occurrence found.");
                  return;
                }
                runAction(
                  () =>
                    skipReminder(reminder.id, {
                      occurrenceId: reminder.occurrenceId!,
                    }),
                  reminder.scheduleType === "one-time"
                    ? "Skipped & removed"
                    : "Skipped → next occurrence"
                );
              }}
            >
              Skip
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={isPending || reminder.status !== "active"}
              onClick={() => setShowReschedule((v) => !v)}
            >
              Reschedule
            </Button>
          </motion.div>
        )}

        {/* 🔥 RESCHEDULE (ANIMATED) */}
        {showReschedule && reminder.status === "active" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              min={toLocalDateTimeInputValue(new Date())}
              className="rounded-md border px-3 py-1 text-sm"
            />

            <Button
              size="sm"
              disabled={isPending || !rescheduleAt}
              onClick={onSaveReschedule}
            >
              Save
            </Button>
          </motion.div>
        )}

        {/* 🔥 LIFECYCLE */}
        {lifecycleMessage && (
          <p className="mt-3 text-xs text-muted-foreground">
            {lifecycleMessage}
          </p>
        )}

        {/* 🔥 FEEDBACK */}
        {actionInfo && (
          <p className="mt-2 text-sm text-emerald-700">{actionInfo}</p>
        )}

        {actionError && (
          <p className="mt-2 text-sm text-red-600">{actionError}</p>
        )}
      </Card>
    </motion.div>
  );
}
