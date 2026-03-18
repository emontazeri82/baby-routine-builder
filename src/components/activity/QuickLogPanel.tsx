"use client";

import QuickLogButton from "./QuickLogButton";
import { ACTIVITY_CONFIG } from "@/lib/activityConfig";

type Props = {
  babyId: string;
  onActivityCreated: (activity: any) => void;
};

/* Optional icons for better UI */
const ACTIVITY_ICONS: Record<string, string> = {
  Feeding: "🍼",
  Sleep: "😴",
  Nap: "💤",
  Diaper: "🧷",
  Play: "🧸",
  Bath: "🛁",
  Medicine: "💊",
  Temperature: "🌡️",
  Growth: "📏",
  Pumping: "🧴",
};

export default function QuickLogPanel({
  babyId,
  onActivityCreated,
}: Props) {
  const activityTypes = Object.values(ACTIVITY_CONFIG);

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {activityTypes.map((activity) => (
        <QuickLogButton
          key={activity.name}
          babyId={babyId}
          activityTypeName={activity.name}
          icon={ACTIVITY_ICONS[activity.name]}
          onActivityCreated={onActivityCreated}
        />
      ))}
    </div>
  );
}