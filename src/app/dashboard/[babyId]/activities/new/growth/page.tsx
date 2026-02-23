
"use client";

import { useState, useMemo } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function GrowthPage() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sanity validation
  const safeWeight =
    weight && Number(weight) > 0 && Number(weight) < 50
      ? Number(weight)
      : undefined;

  const safeHeight =
    height && Number(height) > 0 && Number(height) < 200
      ? Number(height)
      : undefined;

  const safeHead =
    headCircumference &&
    Number(headCircumference) > 0 &&
    Number(headCircumference) < 100
      ? Number(headCircumference)
      : undefined;

  // 🔥 At least one required
  const hasAtLeastOneValue = useMemo(() => {
    return !!(safeWeight || safeHeight || safeHead);
  }, [safeWeight, safeHeight, safeHead]);

  const metadata = {
    weight: safeWeight,
    weightUnit: "kg",
    height: safeHeight,
    heightUnit: "cm",
    headCircumference: safeHead,
    headUnit: "cm",
  };

  const handleBeforeSubmit = () => {
    if (!hasAtLeastOneValue) {
      setError("Please enter at least one measurement.");
      return false; // prevent submit
    }

    setError(null);
    return true;
  };

  return (
    <BaseActivityLayout
      activityName="Growth"
      metadata={metadata}
      beforeSubmit={handleBeforeSubmit} // 🔥 requires support in layout
    >
      <div className="space-y-4">
        <InputWithUnit
          label="Weight"
          unit="kg"
          value={weight}
          step="0.01"
          onChange={setWeight}
        />

        <InputWithUnit
          label="Height"
          unit="cm"
          step="0.1"
          value={height}
          onChange={setHeight}
        />

        <InputWithUnit
          label="Head Circumference"
          unit="cm"
          step="0.1"
          value={headCircumference}
          onChange={setHeadCircumference}
        />

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    </BaseActivityLayout>
  );
}

function InputWithUnit({
  label,
  unit,
  value,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  step: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} ({unit})
      </label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </div>
  );
}
