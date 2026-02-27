"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function DiaperPage() {
  const [type, setType] = useState("wet");
  const [rash, setRash] = useState(false);
  const [volume, setVolume] = useState("medium");
  const [color, setColor] = useState("yellow");
  const [texture, setTexture] = useState("normal");

  const metadata = {
    type,
    rash,
    volume: type === "wet" || type === "mixed" ? volume : null,
    color: type === "dirty" || type === "mixed" ? color : null,
    texture: type === "dirty" || type === "mixed" ? texture : null,
  };

  return (
    <BaseActivityLayout
      activityName="Diaper"
      metadata={metadata}
    >
      {/* Diaper Type */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="wet">Wet</option>
        <option value="dirty">Dirty</option>
        <option value="mixed">Mixed</option>
      </select>

      {/* Volume (only for wet or mixed) */}
      {(type === "wet" || type === "mixed") && (
        <select
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="w-full border p-2 rounded mt-3"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      )}

      {/* Color (only for dirty or mixed) */}
      {(type === "dirty" || type === "mixed") && (
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full border p-2 rounded mt-3"
        >
          <option value="yellow">Yellow</option>
          <option value="green">Green</option>
          <option value="brown">Brown</option>
          <option value="black">Black</option>
          <option value="red">Red</option>
        </select>
      )}

      {/* Texture (only for dirty or mixed) */}
      {(type === "dirty" || type === "mixed") && (
        <select
          value={texture}
          onChange={(e) => setTexture(e.target.value)}
          className="w-full border p-2 rounded mt-3"
        >
          <option value="normal">Normal</option>
          <option value="watery">Watery</option>
          <option value="hard">Hard</option>
          <option value="mucus">Mucus-like</option>
        </select>
      )}

      {/* Rash */}
      <label className="flex items-center gap-2 mt-3">
        <input
          type="checkbox"
          checked={rash}
          onChange={(e) => setRash(e.target.checked)}
        />
        Rash Present
      </label>
    </BaseActivityLayout>
  );
}
