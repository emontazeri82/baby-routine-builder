"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useReminderActions } from "@/hooks/useReminderActions";
import CompleteReminderPrompt from "@/components/reminders/CompleteReminderPrompt";

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



function toLocalDateTimeInputValue(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}



function formatTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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



function buildScheduleLabel(reminder: Reminder) {
  const meta = getScheduleMetadata(reminder.tags);

  const effectiveNext = reminder.nextScheduleAt ?? reminder.nextUpcomingAt;

  if (reminder.scheduleType === "one-time") {
    return `One-time at ${new Date(reminder.remindAt).toLocaleString()}`;
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



function getLifecycleMessage(reminder: Reminder) {
  const now = new Date();

  const snoozedUntil = reminder.snoozedUntil
    ? new Date(reminder.snoozedUntil)
    : null;

  const lastCompleted = reminder.lastCompletedAt
    ? new Date(reminder.lastCompletedAt)
    : null;

  const lastResolved = reminder.lastResolvedAt
    ? new Date(reminder.lastResolvedAt)
    : null;

  if (reminder.overdueCount > 0) {
    return "Action needed now. Complete or skip the due occurrence.";
  }

  if (snoozedUntil && snoozedUntil > now) {
    return `Snoozed until ${format(snoozedUntil, "PPp")}.`;
  }

  if (lastCompleted) {
    return `Occurrence completed on ${format(lastCompleted, "PPp")}.`;
  }

  if (lastResolved && reminder.skippedOccurrences > 0) {
    return `Occurrence skipped on ${format(lastResolved, "PPp")}.`;
  }

  if (reminder.pendingOccurrences > 0 && reminder.nextScheduleAt) {
    return `Next occurrence: ${format(new Date(reminder.nextScheduleAt), "PPp")}.`;
  }

  return null;
}



export default function ReminderCard({ reminder }: { reminder: Reminder }) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  const [rescheduleAt, setRescheduleAt] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setIsHydrated(true);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 10000); // update every 10 seconds

    return () => clearInterval(interval);
  }, []);

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
    return {
      nextUpcoming: reminder.nextScheduleAt
        ? new Date(reminder.nextScheduleAt)
        : reminder.nextUpcomingAt
          ? new Date(reminder.nextUpcomingAt)
          : null,

      snoozedUntil: reminder.snoozedUntil
        ? new Date(reminder.snoozedUntil)
        : null,
    };
  }, [reminder]);

  const isDue = useMemo(() => {
    if (reminder.status !== "active") return false;

    if (reminder.hasDueOccurrence) return true;

    if (!dates.nextUpcoming) return false;

    return dates.nextUpcoming.getTime() <= now.getTime();
  }, [reminder.status, reminder.hasDueOccurrence, dates.nextUpcoming, now]);


  const scheduleLabel = useMemo(
    () => buildScheduleLabel(reminder),
    [reminder.tags, reminder.scheduleType, reminder.remindAt]
  );


  const lifecycleMessage = getLifecycleMessage(reminder);



  const nextUpcomingAbsolute = dates.nextUpcoming
    ? format(dates.nextUpcoming, "PPp")
    : null;

  const nextUpcomingRelative = isHydrated && dates.nextUpcoming
    ? formatDistanceToNow(dates.nextUpcoming, { addSuffix: true })
    : null;



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

        setTimeout(() => router.refresh(), 800);
      } catch {
        setActionError("Network error while running reminder action.");
      }
    });
  }

  function runCompleteOnly() {
    setShowCompletePrompt(false);
    runAction(
      () => completeReminder(reminder.id),
      "Occurrence completed."
    );
  }

  function openActivityThenComplete() {
    setShowCompletePrompt(false);
    const returnTo = encodeURIComponent(`/dashboard/${reminder.babyId}/reminders`);
    const reminderTitle = encodeURIComponent(reminder.title ?? "Reminder");
    const scheduledFor = encodeURIComponent(
      dates.nextUpcoming ? dates.nextUpcoming.toISOString() : new Date().toISOString()
    );
    router.push(
      `/dashboard/${reminder.babyId}/activities/new?fromReminder=1&completeAfterCreate=1&babyId=${reminder.babyId}&reminderId=${reminder.id}&reminderTitle=${reminderTitle}&title=${reminderTitle}&scheduledFor=${scheduledFor}&activityTypeId=${reminder.activityTypeId ?? ""}&returnTo=${returnTo}`
    );
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
          remindAt: date.toISOString(),
        }),
      "Occurrence rescheduled."
    );
  }



  return (
    <motion.div layout>
      <Card className="overflow-hidden border border-border/70 bg-gradient-to-b from-background to-muted/20 p-5 transition-all hover:shadow-md">

        <div className="flex items-start justify-between gap-4">

          <div className="space-y-2">

            <div className="flex items-center gap-3">

              <h3 className="text-lg font-semibold">
                {reminder.title || "Reminder"}
              </h3>

              <Badge variant={reminder.status === "active" ? "success" : "secondary"}>
                {reminder.status}
              </Badge>

              <Badge variant="outline" className="capitalize">
                {reminder.scheduleType}
              </Badge>

            </div>

            <p className="text-sm text-neutral-600">{scheduleLabel}</p>

            {nextUpcomingAbsolute && (
              <p className="text-sm text-neutral-500">
                Next schedule {nextUpcomingAbsolute}
                {nextUpcomingRelative ? ` (${nextUpcomingRelative})` : ""}
              </p>
            )}

          </div>



          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending || reminder.status === "cancelled"}
              title="Delete reminder"
              aria-label="Delete reminder"
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



        {expanded && reminder.description && (
          <div className="mt-4 text-sm text-neutral-600">
            {reminder.description}
          </div>
        )}



        <div className="mt-4 flex flex-wrap items-center gap-2">

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide Details" : "View Details"}
          </Button>

          <Badge variant="outline" className="text-xs">
            Pending: {reminder.pendingOccurrences}
          </Badge>

          <Badge variant="outline" className="text-xs">
            Completed: {reminder.completedOccurrences}
          </Badge>

          <Badge variant="outline" className="text-xs">
            Skipped: {reminder.skippedOccurrences}
          </Badge>

          <Badge variant="outline" className="text-xs">
            Expired: {reminder.expiredOccurrences}
          </Badge>

        </div>



        {reminder.status === "active" && (

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">

            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !isDue}
              title={!isDue ? "No occurrence due yet" : undefined}
              onClick={() => {
                if (reminder.activityTypeId) {
                  setShowCompletePrompt(true);
                } else {
                  runAction(
                    () => completeReminder(reminder.id),
                    "Occurrence completed."
                  );
                }
              }}
            >
              Complete
            </Button>



            {reminder.allowSnooze !== false && (

              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () =>
                      snoozeReminder(reminder.id, { minutes: 10 }),
                    "Occurrence snoozed for 10 minutes."
                  )
                }
              >
                Snooze 10m
              </Button>

            )}



            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !isDue}
              onClick={() =>
                runAction(
                  () => skipReminder(reminder.id),
                  "Occurrence skipped."
                )
              }
            >
              Skip
            </Button>



            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setShowReschedule((v) => !v)}
            >
              Reschedule
            </Button>

          </div>

        )}



        {showReschedule && reminder.status === "active" && (

          <div className="mt-3 flex flex-wrap items-center gap-2">

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

          </div>

        )}

        <CompleteReminderPrompt
          open={showCompletePrompt}
          disabled={isPending}
          onCancel={() => setShowCompletePrompt(false)}
          onCompleteOnly={runCompleteOnly}
          onCreateActivity={openActivityThenComplete}
        />



        {lifecycleMessage && (
          <p className="mt-2 text-xs text-neutral-500">{lifecycleMessage}</p>
        )}



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
