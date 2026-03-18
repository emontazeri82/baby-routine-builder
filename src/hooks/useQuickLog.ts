"use client";

import axios from "axios";

/* ================= METADATA SCHEMA ================= */
/* IMPORTANT:
   - NEVER send empty {}
   - Always match backend expectations
*/

const DEFAULT_METADATA: Record<string, any> = {
  Feeding: { method: "Bottle", amountMl: null },

  Diaper: { type: "wet" },

  Bath: { durationMinutes: null },

  Temperature: { temperatureC: null },

  Medicine: { name: "", dose: "" },

  Growth: { weight: null, height: null },

  Sleep: { quality: null },

  Nap: { durationMinutes: null },

  Play: {
    playType: "General",
    location: "Indoor",
    intensity: "Low",
    mood: "Neutral",
    skills: [],
  },

  Pumping: { amountMl: null },
};

/* ================= TYPE HELPERS ================= */

const DURATION_ACTIVITIES = [
  "Sleep",
  "Nap",
  "Play",
  "Pumping",
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

  const endTime = isDuration ? undefined : startTime;

  /* 🔥 CRITICAL: NEVER SEND EMPTY OBJECT */
  const metadata =
    DEFAULT_METADATA[activityTypeName] ?? { placeholder: true };

  // DEBUG (optional but very useful)
  console.log("QUICK LOG PAYLOAD:", {
    babyId,
    activityTypeName,
    startTime,
    endTime,
    metadata,
  });

  return axios.post("/api/activities", {
    babyId,
    activityTypeName,
    startTime,
    endTime,
    metadata,
    mode: "quick",
  });
}