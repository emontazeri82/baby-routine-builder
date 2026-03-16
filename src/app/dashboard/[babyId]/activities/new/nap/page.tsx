
"use client";

import { useState, useMemo } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

type NapLocation = "crib" | "stroller" | "car" | "parent";
type NapQuality = "good" | "fair" | "poor";

export default function NapPage() {
  const [location, setLocation] = useState<NapLocation>("crib");
  const [quality, setQuality] = useState<NapQuality>("good");
  const [assisted, setAssisted] = useState(false);
  const [notes, setNotes] = useState("");

  const metadata = useMemo(() => {
    return {
      location,
      quality,
      assisted,
      notes: notes.trim() || undefined,
    };
  }, [location, quality, assisted, notes]);

  return (
    <BaseActivityLayout
      activityName="Nap"
      metadata={metadata}
    >
      {/* Location */}
      <div className="space-y-2">
        <label
          htmlFor="nap-location"
          className="text-sm font-medium"
        >
          Nap Location
        </label>

        <select
          id="nap-location"
          value={location}
          onChange={(e) => setLocation(e.target.value as NapLocation)}
          className="w-full border border-gray-300 rounded p-2"
        >
          <option value="crib">Crib</option>
          <option value="stroller">Stroller</option>
          <option value="car">Car</option>
          <option value="parent">On Parent</option>
        </select>
      </div>

      {/* Quality */}
      <div className="space-y-2 mt-4">
        <label
          htmlFor="nap-quality"
          className="text-sm font-medium"
        >
          Nap Quality
        </label>

        <select
          id="nap-quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value as NapQuality)}
          className="w-full border border-gray-300 rounded p-2"
        >
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {/* Assisted */}
      <div className="flex items-center gap-3 mt-4">
        <input
          id="nap-assisted"
          type="checkbox"
          checked={assisted}
          onChange={(e) => setAssisted(e.target.checked)}
          className="h-4 w-4"
        />

        <label
          htmlFor="nap-assisted"
          className="text-sm font-medium"
        >
          Assisted Sleep
        </label>
      </div>

      {/* Notes */}
      <div className="space-y-2 mt-4">
        <label
          htmlFor="nap-notes"
          className="text-sm font-medium"
        >
          Notes (optional)
        </label>

        <textarea
          id="nap-notes"
          placeholder="Optional notes about the nap..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 resize-none"
          rows={3}
        />
      </div>
    </BaseActivityLayout>
  );
}