"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function PlayPage() {
  const [activityType, setActivityType] = useState("tummy_time");
  const [mood, setMood] = useState("happy");

  const metadata = {
    activityType,
    mood,
  };

  return (
    <BaseActivityLayout
      activityName="Play"
      activityTypeId="PLAY_TYPE_ID"
      metadata={metadata}
    >
      <select
        value={activityType}
        onChange={(e) => setActivityType(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="tummy_time">Tummy Time</option>
        <option value="reading">Reading</option>
        <option value="outside">Outside</option>
        <option value="toy">Toy</option>
      </select>

      <select
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="happy">Happy</option>
        <option value="neutral">Neutral</option>
        <option value="fussy">Fussy</option>
      </select>
    </BaseActivityLayout>
  );
}
