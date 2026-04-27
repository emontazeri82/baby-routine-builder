"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { quickLogActivity } from "@/hooks/useQuickLog";

function formatQuickLogError(err: unknown): string {
  const ax = err as {
    response?: { data?: { error?: unknown; message?: unknown } };
  };
  const e = ax?.response?.data?.error;
  const m = ax?.response?.data?.message;
  if (typeof e === "string") return e;
  if (typeof m === "string") return m;
  if (e && typeof e === "object") return JSON.stringify(e);
  return "Activity could not be logged";
}

type Props = {
  babyId: string;
  activityTypeName: string;
  icon?: string;
  onActivityCreated: (activity: any) => void;
};

export default function QuickLogButton({
  babyId,
  activityTypeName,
  icon,
  onActivityCreated,
}: Props) {

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLog() {
    try {
      setLoading(true);

      // ✅ CALL ONLY ONCE
      const res = await quickLogActivity({
        babyId,
        activityTypeName,
      });

      const created = res.data;

      // ✅ UI UPDATE
      onActivityCreated({
        id: created.id,
        startTime: new Date(created.startTime),
        endTime: created.endTime
          ? new Date(created.endTime)
          : null,
        notes: created.notes || null,
        babyId,
        activityName: activityTypeName,
        updatedAt: created.updatedAt
          ? new Date(created.updatedAt)
          : new Date(),
      });

      toast.success(`${activityTypeName} logged`);

      router.refresh();

    } catch (err: unknown) {
      console.error("Quick log error:", err);

      toast.error("Logging failed", {
        description: formatQuickLogError(err),
      });

    } finally {
      setLoading(false);
    }
  }

  return (

    <button
      type="button"
      onClick={handleLog}
      disabled={loading}
      className="
        relative z-10
        flex w-full min-h-[72px]
        flex-col
        items-center
        justify-center
        p-2
        rounded-lg
        text-sm
        touch-manipulation
        hover:bg-black/5
        transition
        disabled:opacity-50
      "
    >

      <span className="text-xl">
        {icon}
      </span>

      <span className="text-xs mt-1">
        {loading ? "..." : activityTypeName}
      </span>

    </button>

  );

}