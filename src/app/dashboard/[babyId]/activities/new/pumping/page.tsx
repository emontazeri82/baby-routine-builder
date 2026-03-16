"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function PumpingPage() {
  const [side, setSide] = useState("both");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("ml");
  const [duration, setDuration] = useState("");
  const [comfort, setComfort] = useState("comfortable");
  const [notes, setNotes] = useState("");

  /* -------- Convert oz → ml internally -------- */

  const convertToMl = (value: number) => {
    if (unit === "oz") {
      return Math.round(value * 29.5735);
    }
    return value;
  };

  const metadata = {
    side,
    amountMl:
      amount !== ""
        ? convertToMl(Number(amount))
        : undefined,
    unit,
    durationMinutes:
      duration !== "" ? Number(duration) : undefined,
    comfort,
    notes: notes || undefined,
  };

  return (
    <BaseActivityLayout
      activityName="Pumping"
      metadata={metadata}
    >

      {/* ================= SIDE ================= */}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Pumping Side
        </label>

        <select
          value={side}
          onChange={(e) => setSide(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* ================= AMOUNT ================= */}

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Amount
        </label>

        <input
          type="number"
          step="1"
          min="0"
          placeholder="Milk amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      {/* ================= UNIT ================= */}

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Unit
        </label>

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="ml">Milliliters (ml)</option>
          <option value="oz">Ounces (oz)</option>
        </select>
      </div>

      {/* ================= DURATION ================= */}

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Pump Duration (minutes)
        </label>

        <input
          type="number"
          min="0"
          step="1"
          placeholder="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      {/* ================= COMFORT ================= */}

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Comfort Level
        </label>

        <select
          value={comfort}
          onChange={(e) => setComfort(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="comfortable">Comfortable</option>
          <option value="neutral">Neutral</option>
          <option value="painful">Painful</option>
        </select>
      </div>

      {/* ================= NOTES ================= */}

      <div className="space-y-2 mt-4">
        <label className="text-sm font-medium">
          Notes
        </label>

        <textarea
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded p-2"
          rows={3}
        />
      </div>

    </BaseActivityLayout>
  );
}