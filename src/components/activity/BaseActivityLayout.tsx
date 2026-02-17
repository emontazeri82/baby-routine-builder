"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

interface BaseProps {
  activityName: string;
  activityTypeId: string;
  children: ReactNode;
  metadata: any;
}

export default function BaseActivityLayout({
  activityName,
  activityTypeId,
  children,
  metadata,
}: BaseProps) {
  const router = useRouter();

  const [babyId, setBabyId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          activityTypeId,
          startTime,
          endTime: endTime || undefined,
          metadata,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }

      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-xl font-semibold mb-6">
        Log {activityName}
      </h1>

      {error && (
        <div className="bg-red-100 text-red-600 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">

        <input
          placeholder="Baby ID"
          value={babyId}
          onChange={(e) => setBabyId(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {children}

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button className="bg-black text-white px-4 py-2 rounded">
          Save {activityName}
        </button>
      </form>
    </div>
  );
}
