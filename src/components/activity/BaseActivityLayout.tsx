"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ActivityTimeRules } from "@/lib/types/activityTypes";

interface BaseProps {
  activityName: string;
  children: ReactNode;
  metadata?: unknown;
  beforeSubmit?: () => boolean; // 👈 ADD THIS
}

export default function BaseActivityLayout({
  activityName,
  children,
  metadata,
  beforeSubmit,
}: BaseProps) {


  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const babyId = params.babyId as string;
  const reminderId = searchParams.get("reminderId");
  const occurrenceId = searchParams.get("occurrenceId");
  const scheduledFor = searchParams.get("scheduledFor");
  const reminderTitle = searchParams.get("reminderTitle") ?? searchParams.get("title");
  const safeReminderTitle = (() => {
    if (!reminderTitle) return null;
    try {
      return decodeURIComponent(reminderTitle);
    } catch {
      return reminderTitle;
    }
  })();
  const completeAfterCreate = searchParams.get("completeAfterCreate") === "1";
  const returnTo = searchParams.get("returnTo");


  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rules = ActivityTimeRules[activityName];
  const requiresEndTime = rules?.requiresEndTime ?? false;

  const allowOptionalEndTime = rules?.allowOptionalEndTime ?? false;
  const showEndTime = requiresEndTime || allowOptionalEndTime;



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!startTime) {
      setError("Start time is required");
      return;
    }

    if (beforeSubmit) {
      const isValid = beforeSubmit();
      if (!isValid) return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          activityTypeName: activityName,
          startTime,
          endTime: endTime || undefined,
          metadata,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save activity");
      }

      const created = await res.json().catch(() => null);
      const linkedActivityId =
        created && typeof created === "object" && "id" in created
          ? String((created as { id: unknown }).id)
          : undefined;

      if (completeAfterCreate && reminderId) {
        const completeRes = await fetch(`/api/reminders/${reminderId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: occurrenceId ?? undefined,
            linkedActivityId,
          }),
        });

        if (!completeRes.ok) {
          const data = await completeRes.json().catch(() => null);
          const message =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof (data as { message?: unknown }).message === "string"
              ? (data as { message: string }).message
              : "Activity saved, but reminder completion failed";
          throw new Error(message);
        }
      }

      if (returnTo) {
        router.push(decodeURIComponent(returnTo));
      } else {
        router.push(`/dashboard/${babyId}/activities`);
      }

    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const parsedScheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    const baseTime =
      parsedScheduledFor && !Number.isNaN(parsedScheduledFor.getTime())
        ? parsedScheduledFor
        : new Date();
    const local = new Date(baseTime.getTime() - baseTime.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setStartTime(local);
  }, [scheduledFor]);


  return (
    <div className="min-h-screen p-8">
      <h1 className="text-xl font-semibold mb-6">
        Log {activityName}
      </h1>
      {reminderId && safeReminderTitle && (
        <p className="mb-4 text-sm text-muted-foreground">
          From reminder: {safeReminderTitle}
        </p>
      )}

      {error && (
        <div className="bg-red-100 text-red-600 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">

        {/* Start Time */}
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        {/* End Time */}
        {showEndTime && (
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required={requiresEndTime}
            className="w-full border p-2 rounded"
          />
        )}


        {/* Custom Activity Fields */}
        {children}

        {/* Notes */}
        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {/* Submit */}
        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : `Save ${activityName}`}
        </button>
      </form>
    </div>
  );
}
