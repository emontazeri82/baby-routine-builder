"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function FeedingPage() {
  const [method, setMethod] = useState("bottle");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("ml");

  const metadata = {
    method,
    amount: amount ? Number(amount) : undefined,
    unit,
  };

  return (
    <BaseActivityLayout
      activityName="Feeding"
      activityTypeId="FEEDING_TYPE_ID_HERE"
      metadata={metadata}
    >
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="breast">Breast</option>
        <option value="bottle">Bottle</option>
        <option value="formula">Formula</option>
        <option value="solid">Solid</option>
      </select>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="ml">ml</option>
        <option value="oz">oz</option>
        <option value="g">g</option>
      </select>
    </BaseActivityLayout>
  );
}
