"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function BathPage() {
  const [temperature, setTemperature] = useState("");
  const [productsUsed, setProductsUsed] = useState("");

  const metadata = {
    temperature: temperature ? Number(temperature) : undefined,
    productsUsed,
  };

  return (
    <BaseActivityLayout
      activityName="Bath"
      activityTypeId="BATH_TYPE_ID"
      metadata={metadata}
    >
      <input
        type="number"
        placeholder="Water Temperature"
        value={temperature}
        onChange={(e) => setTemperature(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Products Used"
        value={productsUsed}
        onChange={(e) => setProductsUsed(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </BaseActivityLayout>
  );
}
