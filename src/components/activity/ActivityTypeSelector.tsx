"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { ACTIVITY_TYPES } from "@/lib/activityTypes";
import { quickLogActivity } from "@/hooks/useQuickLog";
import { useState } from "react";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";
type Mode = "activity" | "reminder";

type Props = {
  mode: Mode;
};

export default function ActivityTypeSelector({ mode }: Props) {
  const params = useParams();
  const router = useRouter();
  const babyId = params.babyId as string;

  const [loading, setLoading] = useState<string | null>(null);

  const basePath =
    mode === "activity"
      ? `/dashboard/babies/${babyId}/activities/new`
      : `/dashboard/babies/${babyId}/reminders/new`;

  async function handleQuickLog(activityName: string) {
    try {
      setLoading(activityName);

      await quickLogActivity({
        babyId,
        activityTypeName: activityName,
      });

      // refresh timeline / dashboard
      router.refresh();
    } catch (err) {
      console.error("Quick log failed", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-8">
        {mode === "activity"
          ? "Select Activity"
          : "Select Reminder Type"}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {ACTIVITY_TYPES.map((type) => {
          const icon = ACTIVITY_ICONS[type.name] || "📝";
          const color =
            ACTIVITY_COLORS[type.name] || "bg-gray-100 text-gray-700";

          return (
            <Card
              key={type.slug}
              className="hover:shadow-md transition p-0"
            >
              {mode === "activity" ? (
                <>
                  <Button
                    variant="ghost"
                    className={`w-full h-24 text-lg rounded-xl flex flex-col gap-1 ${color}`}
                    disabled={loading === type.name}
                    onClick={() => handleQuickLog(type.name)}
                  >
                    <span className="text-2xl">{icon}</span>

                    <span>
                      {loading === type.name ? "Logging..." : type.name}
                    </span>
                  </Button>

                  {/* optional full form */}
                  <Link
                    className="block text-xs text-center pb-2 text-muted-foreground hover:underline"
                    href={`${basePath}/${type.slug}`}
                  >
                    Add Details
                  </Link>
                </>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  className={`w-full h-24 rounded-xl flex flex-col items-center justify-center gap-1
                    ${color} hover:shadow-md active:scale-95 transition`}
                >
                  <Link href={`${basePath}/${type.slug}`}>
                    {/* ICON */}
                    <span className="text-2xl">{icon}</span>

                    {/* NAME */}
                    <span className="text-sm font-medium">{type.name}</span>
                  </Link>
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
