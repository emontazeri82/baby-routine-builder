"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function MedicinePage() {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("ml");

  const metadata = {
    name,
    dose: dose ? Number(dose) : undefined,
    unit,
  };

  return (
    <BaseActivityLayout
      activityName="Medicine"
      activityTypeId="MEDICINE_TYPE_ID"
      metadata={metadata}
    >
      <input
        placeholder="Medicine Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        type="number"
        placeholder="Dose"
        value={dose}
        onChange={(e) => setDose(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Unit"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </BaseActivityLayout>
  );
}
