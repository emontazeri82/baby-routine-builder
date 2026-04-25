"use client";

import axios from "axios";

/* ================= METADATA SCHEMA ================= */
/* IMPORTANT:
   - NEVER send empty {}
   - Always match backend expectations
*/

const DEFAULT_METADATA: Record<string, any> = {
  // Align with FeedingMetadataSchema (method enum is lowercase)
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

/* ================= MAIN FUNCTION ================= */

export async function quickLogActivity({
  babyId,
  activityTypeName,
}: {
  babyId: string;
  activityTypeName: string;
}) {

  const startTime = new Date().toISOString();

  const isDuration = DURATION_ACTIVITIES.includes(activityTypeName);

  /* 🔥 CRITICAL: NEVER SEND EMPTY OBJECT */
  const metadata =
    DEFAULT_METADATA[activityTypeName] ?? { placeholder: true };

  // Omit `endTime` entirely for open-ended duration logs so JSON never carries
  // undefined/null quirks through axios/Zod (Nap/Sleep/Play/etc.).
  const payload: Record<string, unknown> = {
    babyId,
    activityTypeName,
    startTime,
    metadata,
    mode: "quick",
  };

  if (!isDuration) {
    payload.endTime = startTime;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("QUICK LOG PAYLOAD:", payload);
  }

  return axios.post("/api/activities", payload);
}