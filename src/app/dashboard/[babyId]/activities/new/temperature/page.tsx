"use client";

import { useState, useMemo } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function TemperaturePage() {
  const [value, setValue] = useState<string>("");
  const [unit, setUnit] = useState<"C" | "F">("C");

  const parsedValue = useMemo(() => {
    if (value === "") return undefined;

    const num = Number(value);
    if (Number.isNaN(num)) return undefined;

    return num;
  }, [value]);

  const limits = useMemo(() => {
    return unit === "C"
      ? { min: 30, max: 45 }
      : { min: 86, max: 113 };
  }, [unit]);

  const metadata = useMemo(() => {
    return {
      value: parsedValue,
      unit,
    };
  }, [parsedValue, unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnit(e.target.value as "C" | "F");
  };

  const isOutOfRange =
    parsedValue !== undefined &&
    (parsedValue < limits.min || parsedValue > limits.max);

  return (
    <BaseActivityLayout
      activityName="Temperature"
      metadata={metadata}
    >
      {/* Temperature Field */}
      <div className="space-y-2">
        <label
          htmlFor="temperature-input"
          className="text-sm font-medium"
        >
          Temperature
        </label>

        <input
          id="temperature-input"
          type="number"
          step="0.1"
          min={limits.min}
          max={limits.max}
          inputMode="decimal"
          placeholder={`Enter temperature (${unit})`}
          value={value}
          onChange={handleChange}
          className={`w-full border rounded p-2 outline-none transition
            ${isOutOfRange ? "border-red-500" : "border-gray-300"}
          `}
        />

        {isOutOfRange && (
          <p className="text-sm text-red-500">
            Value looks outside a normal range.
          </p>
        )}
      </div>

      {/* Unit Selector */}
      <div className="space-y-2 mt-4">
        <label
          htmlFor="temperature-unit"
          className="text-sm font-medium"
        >
          Unit
        </label>

        <select
          id="temperature-unit"
          value={unit}
          onChange={handleUnitChange}
          className="w-full border border-gray-300 rounded p-2"
        >
          <option value="C">Celsius (°C)</option>
          <option value="F">Fahrenheit (°F)</option>
        </select>
      </div>
    </BaseActivityLayout>
  );
}