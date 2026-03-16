"use client";

import { useEffect, useMemo, useState } from "react";

interface FriendlyCronSchedulerProps {
  initialCron?: string;
  onChange: (
    cron: string,
    text: string,
    metadata: ScheduleMetadata
  ) => void;
}

type Frequency = "daily" | "weekdays" | "custom";

export type ScheduleMetadata = {
  type: "daily" | "weekly" | "custom" | "interval";
  hour: number;
  minute: number;
  daysOfWeek?: number[];
  intervalMinutes?: number;
};

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toTimeLabel(hour: number, minute: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${pad2(h12)}:${pad2(minute)} ${period}`;
}

function toHumanText(
  frequency: Frequency,
  hour: number,
  minute: number,
  customDays: number[]
) {
  const time = toTimeLabel(hour, minute);
  if (frequency === "daily") return `Every day at ${time}`;
  if (frequency === "weekdays") return `Every weekday at ${time}`;
  const labels = DAYS.filter((d) => customDays.includes(d.value)).map(
    (d) => d.label
  );
  return labels.length
    ? `Every ${labels.join(", ")} at ${time}`
    : `Custom schedule at ${time}`;
}

function parseInitialCron(initialCron?: string): {
  hour: number;
  minute: number;
  frequency: Frequency;
  customDays: number[];
} {
  if (!initialCron) {
    return { hour: 8, minute: 0, frequency: "daily", customDays: [1, 3, 5] };
  }

  const fields = initialCron.trim().split(/\s+/);
  if (fields.length !== 5) {
    return { hour: 8, minute: 0, frequency: "daily", customDays: [1, 3, 5] };
  }

  const [m, h, dayOfMonth, month, dayOfWeek] = fields;
  if (dayOfMonth !== "*" || month !== "*") {
    return { hour: 8, minute: 0, frequency: "daily", customDays: [1, 3, 5] };
  }

  const parsedMinute = Number(m);
  const parsedHour = Number(h);
  const hour = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23 ? parsedHour : 8;
  const minute =
    Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59
      ? parsedMinute
      : 0;

  if (dayOfWeek === "*") {
    return { hour, minute, frequency: "daily", customDays: [1, 3, 5] };
  }

  if (dayOfWeek === "1-5") {
    return { hour, minute, frequency: "weekdays", customDays: [1, 3, 5] };
  }

  const customDays = dayOfWeek
    .split(",")
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
    .sort((a, b) => a - b);

  if (customDays.length === 0) {
    return { hour, minute, frequency: "daily", customDays: [1, 3, 5] };
  }

  return { hour, minute, frequency: "custom", customDays };
}

export default function FriendlyCronScheduler({
  initialCron,
  onChange,
}: FriendlyCronSchedulerProps) {
  const initial = useMemo(() => parseInitialCron(initialCron), [initialCron]);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency);
  const [customDays, setCustomDays] = useState<number[]>(initial.customDays);
  const [error, setError] = useState<string>("");

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  const cron = useMemo(() => {
    const dow =
      frequency === "daily"
        ? "*"
        : frequency === "weekdays"
          ? "1-5"
          : customDays.join(",");

    return `${minute} ${hour} * * ${dow}`;
  }, [frequency, customDays, minute, hour]);

  const metadata = useMemo<ScheduleMetadata>(() => {
    if (frequency === "daily") {
      return { type: "daily", hour, minute };
    }
    if (frequency === "weekdays") {
      return { type: "weekly", hour, minute, daysOfWeek: [1, 2, 3, 4, 5] };
    }
    return { type: "custom", hour, minute, daysOfWeek: customDays };
  }, [customDays, frequency, hour, minute]);

  const human = useMemo(() => {
    return toHumanText(frequency, hour, minute, customDays);
  }, [customDays, frequency, hour, minute]);

  useEffect(() => {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setError("Please select a valid time.");
      return;
    }

    if (frequency === "custom" && customDays.length === 0) {
      setError("Pick at least one day for custom schedule.");
      return;
    }

    setError("");
    onChange(cron, human, metadata);
  }, [
    cron,
    customDays.length,
    frequency,
    hour,
    human,
    metadata,
    minute,
    onChange,
  ]);

  return (
    <section
      aria-label="Reminder schedule settings"
      className="space-y-4 rounded-xl border p-4"
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Time of day</legend>
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor="friendly-hour">
            Hour
          </label>
          <select
            id="friendly-hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="rounded-md border px-2 py-1"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {pad2(i)}
              </option>
            ))}
          </select>

          <label className="text-sm" htmlFor="friendly-minute">
            Minute
          </label>
          <select
            id="friendly-minute"
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="rounded-md border px-2 py-1"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>
                {pad2(i)}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Repeat</legend>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="frequency"
              checked={frequency === "daily"}
              onChange={() => setFrequency("daily")}
            />
            Every day
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="frequency"
              checked={frequency === "weekdays"}
              onChange={() => setFrequency("weekdays")}
            />
            Weekdays (Mon-Fri)
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="frequency"
              checked={frequency === "custom"}
              onChange={() => setFrequency("custom")}
            />
            Custom days
          </label>
        </div>

        {frequency === "custom" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {DAYS.map((day) => {
              const selected = customDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleCustomDay(day.value)}
                  aria-pressed={selected}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    selected ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="rounded-md bg-neutral-50 p-3 text-sm">
        <p className="font-medium">Preview</p>
        <p className="text-neutral-700">{human}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
