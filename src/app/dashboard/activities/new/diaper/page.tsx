"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function DiaperPage() {
  const [type, setType] = useState("wet");
  const [rash, setRash] = useState(false);

  const metadata = {
    type,
    rash,
  };

  return (
    <BaseActivityLayout
      activityName="Diaper"
      activityTypeId="DIAPER_TYPE_ID"
      metadata={metadata}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="wet">Wet</option>
        <option value="dirty">Dirty</option>
        <option value="mixed">Mixed</option>
      </select>

      <label className="flex items-center gap-2">
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
