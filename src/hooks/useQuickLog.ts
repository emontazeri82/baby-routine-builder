"use client";

import axios from "axios";

/* ================= METADATA SCHEMA ================= */

const DEFAULT_METADATA: Record<string, any> = {
  Feeding: { method: "bottle" },
  Diaper: { type: "wet" },
  Bath: { location: "tub" },
  Temperature: { temperatureC: null },
  Medicine: { name: "", dose: "" },
  Growth: { weight: null, height: null },
  Sleep: { location: "crib" },
  Nap: { location: "crib" },
  Play: {
    playType: "toy",
    location: "indoor",
    intensity: "calm",
    mood: "neutral",
    skills: [],
  },
  Pumping: { side: "left" },
};

/* ================= TYPE HELPERS ================= */

const DURATION_ACTIVITIES = [
  "Sleep",
  "Nap",
  "Play",
  "Pumping",
  "Bath",
];

function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ================= MAIN FUNCTION ================= */

export async function quickLogActivity({
  babyId,
  activityTypeName,
  duration: durationMinutes,
  date,
}: {
  babyId: string;
  activityTypeName: string;
  duration?: number;
  /** `YYYY-MM-DD` from calendar — anchors the log on that local day (not "now"). */
  date?: string | null;
}) {
  const now = Date.now();
  const isDuration = DURATION_ACTIVITIES.includes(activityTypeName);

  /* 🔥 NEVER send empty metadata */
  const metadata =
    DEFAULT_METADATA[activityTypeName] ?? { placeholder: true };

  /* 🧠 Determine if this is a closed duration session */
  const closedWithDuration =
    isDuration &&
    typeof durationMinutes === "number" &&
    !Number.isNaN(durationMinutes) &&
    durationMinutes > 0;

  /**
   * Where the event "happens" on the timeline:
   * - No `date` → now (dashboard quick log).
   * - `date` is today → now (logging "today" should be current clock).
   * - Another calendar day → noon local on that day (stable vs DST; avoids drifting to wrong date).
   */
  const todayKey = localDateKey(new Date());
  const anchorMs =
    date == null || date === ""
      ? now
      : date === todayKey
        ? now
        : new Date(date + "T12:00:00").getTime();

  let startTimeIso: string;
  let endTimeIso: string | undefined;

  if (closedWithDuration) {
    const end = anchorMs;
    const start = end - durationMinutes! * 60_000;

    startTimeIso = new Date(start).toISOString();
    endTimeIso = new Date(end).toISOString();
  } else {
    /** Instant activities + open duration: single anchor (was wrongly always `now`, ignoring `date`). */
    startTimeIso = new Date(anchorMs).toISOString();
  }

  /* ================= PAYLOAD ================= */

  const payload: Record<string, unknown> = {
    babyId,
    activityTypeName,
    startTime: startTimeIso,
    metadata,
    mode: "quick",
  };

  if (!isDuration) {
    // instant activities (e.g., diaper, feeding)
    payload.endTime = startTimeIso;
  } else if (closedWithDuration && endTimeIso) {
    // duration-based completed activity
    payload.endTime = endTimeIso;
  }
  // else → open activity (timer), no endTime

  /* ================= DEBUG ================= */

  if (process.env.NODE_ENV === "development") {
    console.log("[QuickLog] Payload:", payload);
  }

  /* ================= REQUEST ================= */

  try {
    const res = await axios.post("/api/activities", payload);
    return res;
  } catch (err: any) {
    console.error("[QuickLog] Error:", err?.response || err);
    throw err;
  }
}