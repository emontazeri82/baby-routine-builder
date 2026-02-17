"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function GrowthPage() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");

  const metadata = {
    weight: weight ? Number(weight) : undefined,
    height: height ? Number(height) : undefined,
    headCircumference: headCircumference
      ? Number(headCircumference)
      : undefined,
  };

  return (
    <BaseActivityLayout
      activityName="Growth"
      activityTypeId="GROWTH_TYPE_ID"
      metadata={metadata}
    >
      <input
        type="number"
        placeholder="Weight"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        type="number"
        placeholder="Height"
        value={height}
        onChange={(e) => setHeight(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        type="number"
        placeholder="Head Circumference"
        value={headCircumference}
        onChange={(e) => setHeadCircumference(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </BaseActivityLayout>
  );
}
