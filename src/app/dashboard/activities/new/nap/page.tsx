"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function NapPage() {
  const [location, setLocation] = useState("crib");
  const [quality, setQuality] = useState("good");
  const [assisted, setAssisted] = useState(false);

  const metadata = {
    location,
    quality,
    assisted,
  };

  return (
    <BaseActivityLayout
      activityName="Nap"
      activityTypeId="NAP_TYPE_ID_HERE"
      metadata={metadata}
    >
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="crib">Crib</option>
        <option value="stroller">Stroller</option>
        <option value="car">Car</option>
        <option value="parent">Parent</option>
      </select>

      <select
        value={quality}
        onChange={(e) => setQuality(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </select>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={assisted}
          onChange={(e) => setAssisted(e.target.checked)}
        />
        Assisted Sleep
      </label>
    </BaseActivityLayout>
  );
}
