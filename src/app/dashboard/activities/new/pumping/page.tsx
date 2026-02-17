"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function PumpingPage() {
  const [side, setSide] = useState("both");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("ml");

  const metadata = {
    side,
    amount: amount ? Number(amount) : undefined,
    unit,
  };

  return (
    <BaseActivityLayout
      activityName="Pumping"
      activityTypeId="PUMPING_TYPE_ID"
      metadata={metadata}
    >
      <select
        value={side}
        onChange={(e) => setSide(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="left">Left</option>
        <option value="right">Right</option>
        <option value="both">Both</option>
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
      </select>
    </BaseActivityLayout>
  );
}
