"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function SleepPage() {
  const [wakeUps, setWakeUps] = useState("");
  const [location, setLocation] = useState("crib");
  const [quality, setQuality] = useState("good");

  const metadata = {
    wakeUps: wakeUps ? Number(wakeUps) : undefined,
    location,
    quality,
  };

  return (
    <BaseActivityLayout
      activityName="Sleep"
      activityTypeId="SLEEP_TYPE_ID"
      metadata={metadata}
    >
      <input
        type="number"
        placeholder="Number of wake-ups"
        value={wakeUps}
        onChange={(e) => setWakeUps(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="crib">Crib</option>
        <option value="parent_bed">Parent Bed</option>
      </select>

      <select
        value={quality}
        onChange={(e) => setQuality(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="good">Good</option>
        <option value="restless">Restless</option>
        <option value="frequent_wake">Frequent Wake</option>
      </select>
    </BaseActivityLayout>
  );
}
