"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function BathPage() {
  const [bathType, setBathType] = useState("");
  const [location, setLocation] = useState("");
  const [temperature, setTemperature] = useState("");
  const [productsUsed, setProductsUsed] = useState("");
  const [moodBefore, setMoodBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState("");

  const metadata = {
    bathType,
    location,
    temperature: temperature ? Number(temperature) : undefined,
    productsUsed,
    moodBefore,
    moodAfter,
  };

  return (
    <BaseActivityLayout
      activityName="Bath"
      metadata={metadata}
    >
      {/* Bath Type */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Bath Type</label>
        <select
          value={bathType}
          onChange={(e) => setBathType(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select bath type</option>
          <option value="full_bath">Full Bath</option>
          <option value="quick_rinse">Quick Rinse</option>
          <option value="hair_wash">Hair Wash</option>
        </select>
      </div>

      {/* Location */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select location</option>
          <option value="tub">Tub</option>
          <option value="sink">Sink</option>
          <option value="baby_bath">Baby Bath</option>
        </select>
      </div>

      {/* Temperature */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Water Temperature (°C)</label>
        <input
          type="number"
          placeholder="Example: 37"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Products Used */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Products Used</label>
        <input
          placeholder="Soap, shampoo..."
          value={productsUsed}
          onChange={(e) => setProductsUsed(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Mood Before */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Baby Mood Before Bath</label>
        <select
          value={moodBefore}
          onChange={(e) => setMoodBefore(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select mood</option>
          <option value="happy">Happy</option>
          <option value="fussy">Fussy</option>
          <option value="calm">Calm</option>
          <option value="sleepy">Sleepy</option>
        </select>
      </div>

      {/* Mood After */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Baby Mood After Bath</label>
        <select
          value={moodAfter}
          onChange={(e) => setMoodAfter(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select mood</option>
          <option value="calm">Calm</option>
          <option value="sleepy">Sleepy</option>
          <option value="happy">Happy</option>
          <option value="fussy">Fussy</option>
        </select>
      </div>
    </BaseActivityLayout>
  );
}