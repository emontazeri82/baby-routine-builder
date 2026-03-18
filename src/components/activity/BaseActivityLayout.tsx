"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

interface BaseProps {
  activityName: string;
  children: ReactNode;
  metadata?: unknown;
  beforeSubmit?: () => boolean;
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

  const completeAfterCreate =
    searchParams.get("completeAfterCreate") === "1";

  const returnTo = searchParams.get("returnTo");

  const editId = searchParams.get("editId");

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  /* ================= LOAD EXISTING ACTIVITY (EDIT MODE ONLY) ================= */

  useEffect(() => {
    async function init() {
      try {
        if (editId) {
          const res = await fetch(`/api/activities/${editId}`);

          if (!res.ok) throw new Error("Failed to load activity");

          const data = await res.json();

          setNotes(data.notes || "");
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setInitializing(false);
      }
    }

    init();
  }, [editId]);

  /* ================= SUBMIT ================= */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (beforeSubmit) {
      const isValid = beforeSubmit();
      if (!isValid) return;
    }

    setLoading(true);

    try {
      const url = editId
        ? `/api/activities/${editId}`
        : "/api/activities";

      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          activityTypeName: activityName,
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
        created &&
        typeof created === "object" &&
        "id" in created
          ? String((created as { id: unknown }).id)
          : undefined;

      /* ---------- REMINDER COMPLETION ---------- */

      if (!editId && completeAfterCreate && reminderId) {
        await fetch(`/api/reminders/${reminderId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: occurrenceId ?? undefined,
            linkedActivityId,
          }),
        });
      }

      /* ---------- NAVIGATION ---------- */

      if (returnTo) {
        router.push(decodeURIComponent(returnTo));
      } else {
        router.push(`/dashboard/${babyId}/activities`);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  /* ================= LOADING ================= */

  if (initializing) {
    return (
      <div className="min-h-screen p-8">
        <p className="text-muted-foreground">
          Loading activity...
        </p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-xl font-semibold mb-6">
        {editId ? "Edit" : "Log"} {activityName}
      </h1>

      {error && (
        <div className="bg-red-100 text-red-600 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-md"
      >
        {/* Custom Fields */}
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
          {loading
            ? "Saving..."
            : editId
            ? `Update ${activityName}`
            : `Save ${activityName}`}
        </button>
      </form>
    </div>
  );
}