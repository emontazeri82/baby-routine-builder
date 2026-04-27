"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ACTIVITY_TYPES } from "@/lib/activityTypes";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";
import { requiresDetails } from "@/lib/activities/activityPolicy";
import { quickLogActivity } from "@/hooks/useQuickLog";
import { quickDelete } from "@/hooks/useQuickDelete";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  addActivityOptimistically?: (activity: any) => void;
};

export default function ActivityTypeSelectorPage({
  addActivityOptimistically,
}: Props) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const babyId = params.babyId as string;
  const querySuffix = searchParams.toString()
    ? `?${searchParams.toString()}`
    : "";

  const activityTypeId = searchParams.get("activityTypeId");

  const [isResolvingType, setIsResolvingType] = useState(
    Boolean(activityTypeId)
  );
  const [loading, setLoading] = useState<string | null>(null);

  /* ================= DATE LOGIC (FIXED) ================= */

  const selectedDate = searchParams.get("date");

  const selected = selectedDate
    ? new Date(selectedDate + "T12:00:00")
    : null;

  const today = new Date(new Date().toDateString());

  const isPast = selected ? selected < today : false;

  function localDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /* ================= RESOLVE REMINDER ================= */

  useEffect(() => {
    if (!activityTypeId) return;

    let cancelled = false;

    async function resolveAndRedirect() {
      try {
        const res = await fetch(
          `/api/activity-types/resolve?babyId=${babyId}&activityTypeId=${activityTypeId}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          if (!cancelled) setIsResolvingType(false);
          return;
        }

        const data = await res.json();

        if (!data.slug) {
          if (!cancelled) setIsResolvingType(false);
          return;
        }

        router.replace(
          `/dashboard/${babyId}/activities/new/${data.slug}${querySuffix}`
        );
      } catch {
        if (!cancelled) setIsResolvingType(false);
      }
    }

    resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [activityTypeId, babyId, router, querySuffix]);

  if (isResolvingType) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-semibold">
          Opening activity form...
        </h1>
      </div>
    );
  }

  /* ================= MAIN HANDLER ================= */

  async function handleSelect(type: any) {
    const mustFill = isPast && requiresDetails(type.slug);

    let duration: number | undefined;

    if (mustFill) {
      const input = prompt(`Enter duration (minutes) for ${type.name}:`);

      if (!input) return;

      const parsed = parseInt(input);

      if (isNaN(parsed) || parsed <= 0) {
        toast.error("Invalid duration");
        return;
      }

      duration = parsed;
    }

    try {
      setLoading(type.name);

      /* ================= OPTIMISTIC UI (FIXED) ================= */

      const tempId = `temp-${Date.now()}`;

      const todayKey = localDateKey(new Date());
      const anchorMs =
        selectedDate == null || selectedDate === ""
          ? Date.now()
          : selectedDate === todayKey
            ? Date.now()
            : new Date(selectedDate + "T12:00:00").getTime();

      const optimisticActivity = {
        id: tempId,
        startTime: duration
          ? new Date(anchorMs - duration * 60_000)
          : new Date(anchorMs),
        endTime: duration ? new Date(anchorMs) : null,
        notes: null,
        babyId,
        activityName: type.name,
        updatedAt: new Date(),
      };

      if (typeof addActivityOptimistically === "function") {
        addActivityOptimistically(optimisticActivity);
      }

      /* ================= API ================= */

      const res = await quickLogActivity({
        babyId,
        activityTypeName: type.name,
        duration,
        date: selectedDate,
      });

      const created = res.data;

      /* ================= TOAST (FIXED UX) ================= */

      toast.custom((t) => (
        <div
          className="
            flex items-center justify-between gap-4
            w-[340px]
            rounded-2xl
            bg-white/90 backdrop-blur-xl
            border border-neutral-200
            shadow-[0_10px_40px_rgba(0,0,0,0.15)]
            px-4 py-3
          "
        >
          {/* LEFT CONTENT */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900">
              {type.name} logged
            </span>
            <span className="text-xs text-neutral-500">
              Saved successfully
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            {/* Undo (PRIMARY) */}
            <button
              onClick={async () => {
                toast.dismiss(t);
                await quickDelete(created.id);
                router.refresh();
              }}
              className="
                px-3 py-1.5
                rounded-lg
                text-xs font-medium
                bg-red-50 text-red-600
                hover:bg-red-100
                transition
              "
            >
              Undo
            </button>

            {/* Details (SECONDARY) */}
            <button
              onClick={() => {
                toast.dismiss(t);
                router.push(
                  `/dashboard/${babyId}/activities/new/${type.slug}?activityId=${created.id}`
                );
              }}
              className="
                px-3 py-1.5
                rounded-lg
                text-xs font-medium
                bg-neutral-100 text-neutral-700
                hover:bg-neutral-200
                transition
              "
            >
              Details
            </button>
          </div>
        </div>
      ), { duration: 6000 });

      router.refresh();
    } catch (err: any) {
      console.error("Quick log error:", err);

      toast.error("Logging failed", {
        description:
          err?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(null);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-6">

      {/* ✨ BEAUTIFUL HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="
            sticky top-0 z-40
            mb-6
            backdrop-blur-xl
            bg-white/70
            border-b border-neutral-200
            px-4 py-3
            rounded-b-2xl
          ">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Select Activity
            </h1>
            <p className="text-xs text-neutral-500">
              Tap to log instantly
            </p>
          </div>

          {/* 🔥 CLOSE BUTTON */}
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push(`/dashboard/${babyId}`);
              }
            }}
            className="
              w-9 h-9 flex items-center justify-center
              rounded-full
              bg-white/80 backdrop-blur
              border border-neutral-200
              shadow-sm
              hover:scale-105 hover:shadow-md
              active:scale-95
              transition-all duration-200
            "
          >
            <X className="w-4 h-4 text-neutral-700" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ACTIVITY_TYPES.map((type) => {
          const icon = ACTIVITY_ICONS[type.name] || "📝";
          const color =
            ACTIVITY_COLORS[type.name] ||
            "bg-gray-100 text-gray-700";

          const isLoading = loading === type.name;

          return (
            <Card key={type.slug} className="p-0 overflow-hidden">
              <button
                onClick={() => handleSelect(type)}
                disabled={isLoading}
                className={`
                  w-full h-24
                  flex flex-col items-center justify-center
                  gap-2
                  rounded-xl
                  transition-all duration-200
                  active:scale-95
                  ${color}
                  ${isLoading ? "opacity-50" : ""}
                `}
              >
                <span className="text-2xl">{icon}</span>

                <span className="text-sm font-medium">
                  {isLoading ? "Logging..." : type.name}
                </span>
              </button>

              {isPast && requiresDetails(type.slug) && (
                <div className="text-[10px] text-center pb-2 text-orange-500">
                  duration required
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}