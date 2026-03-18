"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { quickLogActivity } from "@/hooks/useQuickLog";
import { toast } from "@/components/ui/use-toast";

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
      });

      toast({
        title: "Activity logged",
        description: `${activityTypeName} added successfully`,
      });

    } catch (err: any) {
      console.error("Quick log error:", err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Activity could not be logged";

      toast({
        title: "Logging failed",
        description: message,
        variant: "destructive",
      });

    } finally {
      setLoading(false);
    }
  }

  return (

    <button
      onClick={handleLog}
      disabled={loading}
      className="
        flex flex-col
        items-center
        justify-center
        p-2
        rounded-lg
        text-sm
        hover:bg-gray-100
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