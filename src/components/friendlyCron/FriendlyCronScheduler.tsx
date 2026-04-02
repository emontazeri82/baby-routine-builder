"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FriendlyCronSchedulerProps {
  initialCron?: string;
  onChange: (
    cron: string,
    text: string,
    metadata: ScheduleMetadata
  ) => void;
}
type ParsedCron = {
  hour: number;
  minute: number;
  frequency: Frequency;
  customDays: number[];
};

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

function parseInitialCron(initialCron?: string): ParsedCron {
  if (!initialCron) {
    return { hour: 8, minute: 0, frequency: "daily", customDays: [1, 3, 5] };
  }

  const fields = initialCron.trim().split(/\s+/);
  if (fields.length !== 5) {
    return { hour: 8, minute: 0, frequency: "daily", customDays: [1, 3, 5] };
  }

  const [m, h, , , dayOfWeek] = fields;

  const hour = Number(h);
  const minute = Number(m);

  if (dayOfWeek === "*") {
    return { hour, minute, frequency: "daily", customDays: [1, 3, 5] };
  }

  if (dayOfWeek === "1-5") {
    return { hour, minute, frequency: "weekdays", customDays: [1, 3, 5] };
  }

  const customDays = dayOfWeek
    .split(",")
    .map(Number)
    .filter((v) => v >= 0 && v <= 6);

  return { hour, minute, frequency: "custom", customDays };
}

export default function FriendlyCronScheduler({
  initialCron,
  onChange,
}: FriendlyCronSchedulerProps) {
  const initial = useMemo(() => parseInitialCron(initialCron), [initialCron]);

  // ✅ 12h + AM/PM
  const initialHour12 = initial.hour % 12 === 0 ? 12 : initial.hour % 12;
  const initialPeriod = initial.hour >= 12 ? "PM" : "AM";

  const [hour12, setHour12] = useState(initialHour12);
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);
  const [minute, setMinute] = useState(initial.minute);

  const [frequency, setFrequency] = useState<Frequency>(initial.frequency);
  const [customDays, setCustomDays] = useState<number[]>(initial.customDays);
  const [error, setError] = useState("");

  // ✅ convert to 24h
  const hour24 = useMemo(() => {
    return period === "PM"
      ? hour12 % 12 + 12
      : hour12 % 12;
  }, [hour12, period]);

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  }

  const cron = useMemo(() => {
    const dow =
      frequency === "daily"
        ? "*"
        : frequency === "weekdays"
          ? "1-5"
          : customDays.join(",");

    return `${minute} ${hour24} * * ${dow}`;
  }, [frequency, customDays, minute, hour24]);

  const metadata = useMemo<ScheduleMetadata>(() => {
    if (frequency === "daily") {
      return { type: "daily", hour: hour24, minute };
    }
    if (frequency === "weekdays") {
      return { type: "weekly", hour: hour24, minute, daysOfWeek: [1, 2, 3, 4, 5] };
    }
    return { type: "custom", hour: hour24, minute, daysOfWeek: customDays };
  }, [frequency, customDays, hour24, minute]);

  const human = useMemo(() => {
    return toHumanText(frequency, hour24, minute, customDays);
  }, [frequency, hour24, minute, customDays]);

  useEffect(() => {
    if (minute < 0 || minute > 59) {
      setError("Invalid time.");
      return;
    }

    if (frequency === "custom" && customDays.length === 0) {
      setError("Pick at least one day.");
      return;
    }

    setError("");
    onChange(cron, human, metadata);
  }, [cron, frequency, customDays.length, minute, human, metadata, onChange]);

  return (
    <section className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      {/* TIME */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Time</p>

        <div className="flex items-center gap-2">
          {/* hour */}
          <select
            value={hour12}
            onChange={(e) => setHour12(Number(e.target.value))}
            className="rounded-md border px-2 py-1"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {pad2(h)}
              </option>
            ))}
          </select>

          :

          {/* minute */}
          <select
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

          {/* AM PM */}
          <div className="flex rounded-md border overflow-hidden">
            {["AM", "PM"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p as "AM" | "PM")}
                className={cn(
                  "px-3 py-1 text-sm",
                  period === p
                    ? "bg-blue-500 text-white"
                    : "bg-background hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FREQUENCY */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Repeat</p>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: "daily", label: "Daily" },
            { key: "weekdays", label: "Weekdays" },
            { key: "custom", label: "Custom" },
          ].map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={frequency === item.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFrequency(item.key as Frequency)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {frequency === "custom" && (
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const selected = customDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleCustomDay(day.value)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm border",
                    selected
                      ? "bg-blue-500 text-white"
                      : "hover:bg-muted"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm border border-blue-100">
        <p className="font-medium">Preview</p>
        <p className="text-neutral-700">{human}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}