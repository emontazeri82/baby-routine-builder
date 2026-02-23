"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ReminderFormPage() {
  const router = useRouter();
  const params = useParams();

  const babyId = params.babyId as string;
  const slug = params.slug as string;

  const [remindAt, setRemindAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          activitySlug: slug,
          remindAt,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save reminder");
      }

      router.push(`/dashboard/${babyId}/reminders`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-md">
      <h1 className="text-xl font-semibold mb-6">
        Schedule {slug}
      </h1>

      {error && (
        <div className="bg-red-100 text-red-600 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Reminder"}
        </button>
      </form>
    </div>
  );
}
