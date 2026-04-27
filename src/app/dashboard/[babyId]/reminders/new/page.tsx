"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const reminderTypes = [
  { name: "Feeding", slug: "feeding" },
  { name: "Nap", slug: "nap" },
  { name: "Sleep", slug: "sleep" },
  { name: "Diaper", slug: "diaper" },
  { name: "Play", slug: "play" },
  { name: "Medicine", slug: "medicine" },
  { name: "Bath", slug: "bath" },
  { name: "Temperature", slug: "temperature" },
  { name: "Growth", slug: "growth" },
  { name: "Pumping", slug: "pumping" },
  { name: "Simple Reminder", slug: "simple" },
];

export default function NewReminderPage() {
  const params = useParams();
  const babyId = params.babyId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const dateSuffix = dateParam
    ? `?date=${encodeURIComponent(dateParam)}`
    : "";

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* ✨ BEAUTIFUL HEADER WITH CLOSE */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          sticky top-0 z-40
          backdrop-blur-xl
          bg-white/70
          border-b border-neutral-200
          px-4 py-3
          rounded-b-2xl
        "
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Select Reminder Type
            </h1>
            <p className="text-xs text-neutral-500">
              Schedule a future activity
            </p>
          </div>

          {/* ❌ CLOSE BUTTON */}
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


      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {reminderTypes.map((type) => {
          const icon = ACTIVITY_ICONS[type.name] || "📝";
          const color =
            ACTIVITY_COLORS[type.name] ||
            "bg-gray-100 text-gray-700";

          return (
            <motion.div
              key={type.slug}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="hover:shadow-lg transition p-0">
                <Button
                  asChild
                  variant="ghost"
                  className={`w-full h-24 rounded-xl flex flex-col items-center justify-center gap-1
                  ${color}`}
                >
                  <Link
                    href={`/dashboard/${babyId}/reminders/new/${type.slug}${dateSuffix}`}
                  >
                    {/* ICON */}
                    <span className="text-2xl">
                      {icon}
                    </span>

                    {/* NAME */}
                    <span className="text-sm font-medium">
                      {type.name}
                    </span>
                  </Link>
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}