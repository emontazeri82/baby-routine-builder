"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function TemperaturePage() {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("C");

  const metadata = {
    value: value ? Number(value) : undefined,
    unit,
  };

  return (
    <BaseActivityLayout
      activityName="Temperature"
      activityTypeId="TEMPERATURE_TYPE_ID"
      metadata={metadata}
    >
      <input
        type="number"
        placeholder="Temperature"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="C">Celsius</option>
        <option value="F">Fahrenheit</option>
      </select>
    </BaseActivityLayout>
  );
}
