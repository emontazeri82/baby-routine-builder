"use client";

import { useState } from "react";
import BaseActivityLayout from "@/components/activity/BaseActivityLayout";

export default function MedicinePage() {
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("ml");
  const [method, setMethod] = useState("");
  const [reason, setReason] = useState("");
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");

  const metadata = {
    medicineName,
    dose: dose ? Number(dose) : undefined,
    unit,
    method,
    reason,
    reaction,
    notes,
  };

  return (
    <BaseActivityLayout activityName="Medicine" metadata={metadata}>
      
      {/* Medicine Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Medicine Name</label>
        <input
          placeholder="Example: Paracetamol"
          value={medicineName}
          onChange={(e) => setMedicineName(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Dose */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Dose</label>
        <input
          type="number"
          placeholder="Example: 5"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          min="0.1"
          step="any"
          required
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Unit */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Unit</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="ml">ml</option>
          <option value="mg">mg</option>
          <option value="drops">drops</option>
          <option value="tablet">tablet</option>
        </select>
      </div>

      {/* Method */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select method</option>
          <option value="oral">Oral</option>
          <option value="drops">Drops</option>
          <option value="injection">Injection</option>
          <option value="inhaler">Inhaler</option>
        </select>
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select reason</option>
          <option value="fever">Fever</option>
          <option value="pain">Pain</option>
          <option value="infection">Infection</option>
          <option value="vitamins">Vitamins</option>
          <option value="allergy">Allergy</option>
        </select>
      </div>

      {/* Reaction */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Reaction</label>
        <select
          value={reaction}
          onChange={(e) => setReaction(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select reaction</option>
          <option value="none">None</option>
          <option value="sleepy">Sleepy</option>
          <option value="vomiting">Vomiting</option>
          <option value="rash">Rash</option>
          <option value="irritable">Irritable</option>
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>
    </BaseActivityLayout>
  );
}
