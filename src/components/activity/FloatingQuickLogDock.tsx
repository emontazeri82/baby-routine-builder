"use client";

import QuickLogButton from "./QuickLogButton";

type Props = {
  babyId: string;
  onActivityCreated: (activity: any) => void;
};

export default function FloatingQuickLogDock({
  babyId,
  onActivityCreated,
}: Props) {
  return (
    <div
      className="
        fixed
        bottom-0
        left-0
        right-0
        bg-white
        border-t
        shadow-lg
        p-3
        z-50
      "
    >
      <div className="grid grid-cols-5 gap-2 text-center">

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Feeding"
          icon="🍼"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Sleep"
          icon="😴"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Nap"
          icon="💤"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Diaper"
          icon="🧷"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Play"
          icon="🧸"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Bath"
          icon="🛁"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Medicine"
          icon="💊"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Temperature"
          icon="🌡️"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Growth"
          icon="📏"
          onActivityCreated={onActivityCreated}
        />

        <QuickLogButton
          babyId={babyId}
          activityTypeName="Pumping"
          icon="🧴"
          onActivityCreated={onActivityCreated}
        />

      </div>
    </div>
  );
}