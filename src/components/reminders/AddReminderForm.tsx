"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES } from "@/lib/activityTypes";
import FriendlyCronScheduler, {
  ScheduleMetadata,
} from "@/components/friendlyCron/FriendlyCronScheduler";

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

function toLocalDateTimeInputValue(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AddReminderForm({
  babyId,
  onSuccessRedirectTo,
  initialReminderMode = "activity",
  initialActivityTypeSlug,
}: Props) {
  const router = useRouter();

  const [scheduleType, setScheduleType] =
    useState<ScheduleType>("one-time");
  const [reminderMode, setReminderMode] = useState<"activity" | "simple">(
    initialReminderMode
  );
  const [activityTypeSlug, setActivityTypeSlug] = useState(
    initialActivityTypeSlug ?? ""
  );
  const [remindAt, setRemindAt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cronExpression, setCronExpression] = useState("");
  const [cronText, setCronText] = useState("");
  const [scheduleMetadata, setScheduleMetadata] =
    useState<ScheduleMetadata | null>(null);
  const [repeatIntervalMinutes, setRepeatIntervalMinutes] =
    useState("");
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [allowSnooze, setAllowSnooze] = useState(true);
  const [maxSnoozes, setMaxSnoozes] = useState("");
  const [priority, setPriority] = useState("1");
  const [tagsInput, setTagsInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [tagsInput]
  );
  const minRemindAt = toLocalDateTimeInputValue(new Date());

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



  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    let remindAtDate: Date | null = null;
    let effectiveCron: string | undefined;
    let effectiveMetadata: ScheduleMetadata | undefined;

    if (scheduleType === "one-time") {
      remindAtDate = new Date(remindAt);
      if (Number.isNaN(remindAtDate.getTime())) {
        setError("Please provide a valid one-time reminder date/time.");
        return;
      }
      if (remindAtDate <= new Date()) {
        setError("You cannot create a reminder in the past.");
        return;
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
      remindAtDate = new Date(remindAt);
      if (Number.isNaN(remindAtDate.getTime())) {
        setError("Interval reminders require a valid start date/time.");
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
        remindAt: remindAtDate.toISOString(),
        title: title.trim(),
        description: description.trim() || undefined,
        cronExpression: scheduleType === "recurring" ? effectiveCron : undefined,
        scheduleMetadata:
          scheduleType === "recurring" || scheduleType === "interval"
            ? effectiveMetadata
            : undefined,
        repeatIntervalMinutes:
          scheduleType === "interval" && repeatIntervalMinutes
            ? Number(repeatIntervalMinutes)
            : undefined,
        adaptiveEnabled,
        allowSnooze,
        maxSnoozes:
          allowSnooze && maxSnoozes
            ? Number(maxSnoozes)
            : undefined,
        priority: priority ? Number(priority) : undefined,
        tags: parsedTags.length ? parsedTags : undefined,
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

      <label className="block space-y-1">
        <span className="text-sm font-medium">Reminder Type *</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2">
            <input
              type="radio"
              name="reminder-mode"
              checked={reminderMode === "activity"}
              onChange={() => setReminderMode("activity")}
            />
            <span className="text-sm">Activity reminder</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2">
            <input
              type="radio"
              name="reminder-mode"
              checked={reminderMode === "simple"}
              onChange={() => setReminderMode("simple")}
            />
            <span className="text-sm">Simple reminder</span>
          </label>
        </div>
      </label>

      {reminderMode === "activity" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Activity Type *</span>
          <select
            value={activityTypeSlug}
            onChange={(e) => setActivityTypeSlug(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Select activity type</option>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Schedule Type *</span>
        <select
          value={scheduleType}
          onChange={(e) => {
            const next = e.target.value as ScheduleType;
            setScheduleType(next);
            if (next !== "recurring") {
              setCronExpression("");
              setCronText("");
              setScheduleMetadata(null);
            }
          }}
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="one-time">One-time</option>
          <option value="recurring">Recurring</option>
          <option value="interval">Interval</option>
        </select>
        <p className="text-xs text-neutral-500">
          Cron is automatically generated when you choose recurring.
        </p>
      </label>

      {scheduleType !== "recurring" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">
            Remind At *
          </span>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            min={minRemindAt}
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Title *</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">
          Description (optional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          rows={3}
        />
      </label>

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
            onChange={(e) => setRepeatIntervalMinutes(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
      )}

      {allowSnooze && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">
            Max Snoozes (optional)
          </span>
          <input
            type="number"
            min={0}
            value={maxSnoozes}
            onChange={(e) => setMaxSnoozes(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Priority (1-10) *</span>
        <input
          type="number"
          min={1}
          max={10}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">
          Tags (comma separated)
        </span>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="sleep, night, routine"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={allowSnooze}
          onChange={(e) => {
            const next = e.target.checked;
            setAllowSnooze(next);
            if (!next) {
              setMaxSnoozes("");
            }
          }}
        />
        <span className="text-sm">Allow snooze</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={adaptiveEnabled}
          onChange={(e) => setAdaptiveEnabled(e.target.checked)}
        />
        <span className="text-sm">Adaptive reminder enabled</span>
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Reminder"}
      </Button>
    </form>
  );
}
