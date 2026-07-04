"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ACTIVITY_TYPES } from "@/lib/activityTypes";
import FriendlyCronScheduler, {
  ScheduleMetadata,
} from "@/components/friendlyCron/FriendlyCronScheduler";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";

import { useSearchParams } from "next/navigation";

type ScheduleType = "one-time" | "recurring" | "interval";

type Props = {
  babyId: string;
  onSuccessRedirectTo?: string;
  initialReminderMode?: "activity" | "simple";
  initialActivityTypeSlug?: string;
};

type ApiError = {
  status?: "error";
  code?: string;
  message?: string;
  details?: unknown;
  error?: string | { message?: string };
};

/** Avoid `new Date("YYYY-MM-DDTHH:mm")` — parsing is UTC/implementation-dependent. */
function parseLocalYmdTime(ymd: string, hour: number, minute: number): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    const fall = new Date();
    fall.setMinutes(fall.getMinutes() + 15);
    fall.setSeconds(0, 0);
    return fall;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d, hour, minute, 0, 0);
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

function isSameLocalCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function defaultSelectedDateFromParam(
  selectedDateParam: string | null
): Date {
  if (selectedDateParam) {
    return parseLocalYmdTime(selectedDateParam, 9, 0);
  }
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5 + 5);
  now.setSeconds(0, 0);
  return now;
}

export default function AddReminderForm({
  babyId,
  onSuccessRedirectTo,
  initialReminderMode = "activity",
  initialActivityTypeSlug,
}: Props) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const selectedDateParam = searchParams.get("date");

  const [scheduleType, setScheduleType] =
    useState<ScheduleType>("one-time");
  const reminderMode = initialReminderMode;

  const isDateLocked =
    (scheduleType === "one-time" || scheduleType === "interval") &&
    !!selectedDateParam;

  const [activityTypeSlug, setActivityTypeSlug] = useState(
    initialActivityTypeSlug ?? ""
  );

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    defaultSelectedDateFromParam(selectedDateParam)
  );

  useEffect(() => {
    if (!selectedDateParam) return;
    setSelectedDate(parseLocalYmdTime(selectedDateParam, 9, 0));
  }, [selectedDateParam]);

  const [title, setTitle] = useState("");
  const [cronExpression, setCronExpression] = useState("");
  const [cronText, setCronText] = useState("");
  const [scheduleMetadata, setScheduleMetadata] =
    useState<ScheduleMetadata | null>(null);
  const [repeatIntervalMinutes, setRepeatIntervalMinutes] =
    useState("");
  const [adaptiveEnabled] = useState(false);
  const [allowSnooze] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const QUICK_TIMES = [
    { label: "10 min", minutes: 10 },
    { label: "30 min", minutes: 30 },
    { label: "1 hour", minutes: 60 },
    { label: "Tonight", hour: 20, minute: 0 },
    { label: "Tomorrow", addDays: 1 },
  ];


  function getNextRecurringAnchor(meta: ScheduleMetadata) {
    const now = new Date();

    const candidate = new Date();
    candidate.setSeconds(0, 0);
    candidate.setMilliseconds(0);
    candidate.setHours(meta.hour, meta.minute, 0, 0);

    // DAILY
    if (meta.type === "daily") {
      if (candidate < now) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate;
    }

    // WEEKLY / CUSTOM
    const selectedDays =
      meta.daysOfWeek && meta.daysOfWeek.length > 0
        ? meta.daysOfWeek
        : [0, 1, 2, 3, 4, 5, 6];

    for (let i = 0; i < 7; i++) {
      const probe = new Date(candidate);
      probe.setDate(candidate.getDate() + i);

      if (!selectedDays.includes(probe.getDay())) continue;

      // allow today only if the time has not passed
      if (i === 0 && probe <= now) continue;

      return probe;
    }

    // fallback (should almost never happen)
    const fallback = new Date(candidate);
    fallback.setDate(candidate.getDate() + 1);
    return fallback;
  }

  function generateDefaultTitle() {
    // Activity-based reminder
    if (reminderMode === "activity" && activityTypeSlug) {
      const activity = ACTIVITY_TYPES.find(
        (t) => t.slug === activityTypeSlug
      );

      if (activity) {
        return `${activity.name} reminder`;
      }

      return "Activity reminder";
    }

    // Simple reminder fallback
    return "Reminder";
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    let remindAtDate: Date | null = null;
    let effectiveCron: string | undefined;
    let effectiveMetadata: ScheduleMetadata | undefined;

    if (scheduleType === "one-time") {
      remindAtDate = selectedDate;

      if (!selectedDate || isNaN(selectedDate.getTime())) {
        setError("Please select a valid date and time.");
        return;
      }
      if (remindAtDate <= new Date()) {
        if (isDateLocked) {
          const bumped = new Date(remindAtDate);
          bumped.setMinutes(bumped.getMinutes() + 1);
          let tries = 0;
          while (bumped <= new Date() && tries++ < 24 * 60) {
            bumped.setMinutes(bumped.getMinutes() + 1);
          }
          if (bumped <= new Date()) {
            setError("Choose a later time on this date.");
            return;
          }
          remindAtDate = bumped;
        } else {
          const adjusted = new Date();
          adjusted.setMinutes(adjusted.getMinutes() + 1);
          remindAtDate = adjusted;
        }
      }
    }

    if (scheduleType === "recurring") {
      if (!cronExpression.trim()) {
        setError("Recurring reminders require a valid schedule.");
        return;
      }
      if (!scheduleMetadata) {
        setError("Recurring schedule metadata is missing.");
        return;
      }
      if (
        !Number.isInteger(scheduleMetadata.hour) ||
        !Number.isInteger(scheduleMetadata.minute) ||
        scheduleMetadata.hour < 0 ||
        scheduleMetadata.hour > 23 ||
        scheduleMetadata.minute < 0 ||
        scheduleMetadata.minute > 59
      ) {
        setError("Recurring schedule has invalid hour/minute.");
        return;
      }

      effectiveCron = cronExpression.trim();
      effectiveMetadata = scheduleMetadata;
      remindAtDate = getNextRecurringAnchor(scheduleMetadata);
    }

    if (scheduleType === "interval") {
      remindAtDate = selectedDate;

      if (isNaN(remindAtDate.getTime())) {
        setError("Invalid start time.");
        return;
      }

      if (remindAtDate < new Date()) {
        setError("You cannot create a reminder in the past.");
        return;
      }
      if (!repeatIntervalMinutes || Number(repeatIntervalMinutes) <= 0) {
        setError("Interval reminders require repeat interval minutes.");
        return;
      }
      effectiveMetadata = {
        type: "interval",
        hour: remindAtDate.getHours(),
        minute: remindAtDate.getMinutes(),
        intervalMinutes: Number(repeatIntervalMinutes),
      };
    }

    if (!remindAtDate) {
      setError("Unable to determine reminder start time.");
      return;
    }
    if (reminderMode === "activity" && !activityTypeSlug) {
      setError("Please select an activity type for activity reminder.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        babyId,
        reminderMode,
        scheduleType,
        remindAt: toWallClockIso(remindAtDate),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        // ✅ smart title
        title: title.trim() || generateDefaultTitle(),

        // ❌ removed fields
        // description
        // tags
        // priority
        // maxSnoozes

        cronExpression: scheduleType === "recurring" ? effectiveCron : undefined,

        scheduleMetadata:
          scheduleType === "recurring" || scheduleType === "interval"
            ? effectiveMetadata
            : undefined,

        repeatIntervalMinutes:
          scheduleType === "interval" && repeatIntervalMinutes
            ? Number(repeatIntervalMinutes)
            : undefined,

        // ✅ KEEP (system-level behavior)
        adaptiveEnabled,
        allowSnooze,

        activityTypeSlug:
          reminderMode === "activity" ? activityTypeSlug : undefined,
      };

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        const errorMessage =
          body.message ??
          (typeof body.error === "string" ? body.error : body.error?.message);
        throw new Error(
          errorMessage ?? "Failed to create reminder"
        );
      }

      router.push(
        onSuccessRedirectTo ?? `/dashboard/${babyId}/reminders`
      );
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to create reminder";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {reminderMode === "activity" && (
        <div className="space-y-1">
          <span className="text-sm font-medium">Activity Type *</span>

          {/* ✅ CASE 1: Already selected → SHOW PREVIEW ONLY */}
          {initialActivityTypeSlug ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40">
              <span>
                {ACTIVITY_ICONS[
                  ACTIVITY_TYPES.find((t) => t.slug === activityTypeSlug)?.name || ""
                ] || "📝"}
              </span>

              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  ACTIVITY_COLORS[
                  ACTIVITY_TYPES.find((t) => t.slug === activityTypeSlug)?.name || ""
                  ] || "bg-muted"
                )}
              >
                {ACTIVITY_TYPES.find((t) => t.slug === activityTypeSlug)?.name ||
                  "Activity"}
              </span>
            </div>
          ) : (
            /* ✅ CASE 2: No preselected → SHOW SELECTOR */
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const isActive = activityTypeSlug === type.slug;

                const icon = ACTIVITY_ICONS[type.name] || "📝";
                const color = ACTIVITY_COLORS[type.name] || "bg-muted";

                return (
                  <button
                    key={type.slug}
                    type="button"
                    onClick={() => setActivityTypeSlug(type.slug)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all border",

                      !isActive &&
                      "bg-background hover:shadow-sm hover:-translate-y-[1px]",

                      isActive &&
                      "border-blue-500 bg-blue-50 shadow-sm scale-[1.02]"
                    )}
                  >
                    <span>{icon}</span>

                    <span className={cn("px-2 py-0.5 rounded text-xs", color)}>
                      {type.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">When should this happen?</span>

        <p className="text-xs text-neutral-500">
          Cron is automatically generated when you choose recurring.
        </p>
      </label>
      <div className="flex gap-2">
        {["one-time", "recurring", "interval"].map((type) => {
          const isActive = scheduleType === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setScheduleType(type as ScheduleType);
                if (type !== "recurring") {
                  setCronExpression("");
                  setCronText("");
                  setScheduleMetadata(null);
                }
              }}
              className={cn(
                "px-4 py-2 rounded-full text-sm transition-all border",

                !isActive &&
                "bg-muted text-muted-foreground hover:scale-105",

                isActive &&
                "bg-blue-500 text-white shadow-md scale-105"
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
      {scheduleType !== "recurring" && (
        <div className="space-y-3">
          <span className="text-sm font-medium">Remind me at</span>

          {/* ✅ ADD IT HERE */}
          {isDateLocked && (
            <p className="text-xs text-blue-500 font-medium">
              Date locked from calendar selection
            </p>
          )}
          {/* ✅ QUICK TIMES */}
          <div className="flex flex-wrap gap-2">
            {QUICK_TIMES.map((item) => {
              const now = new Date();

              const baseNow = selectedDate ?? new Date();
              let previewDate = new Date(baseNow);

              if (item.minutes) {
                previewDate.setMinutes(previewDate.getMinutes() + item.minutes);
              }

              if (item.hour !== undefined) {
                previewDate.setHours(item.hour, item.minute || 0, 0, 0);
                if (previewDate < now) previewDate.setDate(previewDate.getDate() + 1);
              }

              if (item.addDays) {
                const y = baseNow.getFullYear();
                const m = baseNow.getMonth();
                const d = baseNow.getDate();
                previewDate = new Date(
                  y,
                  m,
                  d + item.addDays,
                  9,
                  0,
                  0,
                  0
                );
              }

              const isSelected =
                selectedDate &&
                Math.abs(selectedDate.getTime() - previewDate.getTime()) < 60000;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (isDateLocked) {
                      // allow ONLY same-day time changes
                      if (item.minutes || item.addDays) return;
                    }
                    setSelectedDate(previewDate);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full border transition",
                    isSelected
                      ? "bg-blue-500 text-white"
                      : "hover:bg-muted"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* ✅ CALENDAR PICKER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                {selectedDate
                  ? selectedDate.toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                  : "Pick date & time"}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-3 space-y-3">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                disabled={
                  isDateLocked
                    ? (day) => !isSameLocalCalendarDay(day, selectedDate)
                    : undefined
                }
                onSelect={(date) => {
                  if (!date || isDateLocked) return;

                  const updated = new Date(date);

                  // ✅ ALWAYS keep a valid time
                  updated.setHours(
                    selectedDate.getHours(),
                    selectedDate.getMinutes(),
                    0,
                    0
                  );

                  setSelectedDate(updated);
                }}
              />

              {/* ⏰ TIME PICKER */}
              <input
                type="time"
                value={`${String(selectedDate.getHours()).padStart(2, "0")}:${String(
                  selectedDate.getMinutes()
                ).padStart(2, "0")}`}
                className="w-full border rounded-md px-2 py-1 text-sm"
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);

                  const updated = new Date(selectedDate);
                  updated.setHours(h, m, 0, 0);

                  setSelectedDate(updated);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Title (optional)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          className="w-full rounded-md border px-3 py-2"
        />
      </label>
      {!title && (
        <p className="text-xs text-muted-foreground">
          Default: <strong>{generateDefaultTitle()}</strong>
        </p>
      )}
      {scheduleType === "recurring" && (
        <div className="space-y-2">
          <FriendlyCronScheduler
            initialCron={cronExpression || undefined}
            onChange={(cron, text, metadata) => {
              setCronExpression(cron);
              setCronText(text);
              setScheduleMetadata(metadata);
            }}
          />

          <div className="rounded-md bg-neutral-50 p-3 text-sm">
            <p className="font-medium">Schedule Preview</p>
            <p className="text-neutral-700">
              {cronText || "Pick a recurring schedule above."}
            </p>
          </div>
        </div>
      )}

      {scheduleType === "interval" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">
            Repeat Interval Minutes *
          </span>

          <input
            type="number"
            min={1}
            value={repeatIntervalMinutes}
            onChange={(e) => {
              setRepeatIntervalMinutes(e.target.value);
            }}
            required
            className="w-full rounded-md border px-3 py-2"
          />

          <p className="text-xs text-muted-foreground">
            This reminder will repeat every {repeatIntervalMinutes || "X"} minutes
          </p>
        </label>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Reminder"}
      </Button>
    </form>
  );
}
