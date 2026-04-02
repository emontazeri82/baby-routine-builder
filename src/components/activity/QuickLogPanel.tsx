"use client";

import QuickLogButton from "./QuickLogButton";
import { ACTIVITY_CONFIG } from "@/lib/activityConfig";
import { ACTIVITY_ICONS, ACTIVITY_COLORS } from "@/lib/activityUI";
import { motion, Variants } from "framer-motion";

type Props = {
  babyId: string;
  onActivityCreated: (activity: any) => void;
};

/* Animation Variants */
const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export default function QuickLogPanel({
  babyId,
  onActivityCreated,
}: Props) {
  const activityTypes = Object.values(ACTIVITY_CONFIG);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
    >
      {activityTypes.map((activity) => {
        const icon = ACTIVITY_ICONS[activity.name] || "📝";
        const color =
          ACTIVITY_COLORS[activity.name] ||
          "bg-gray-100 text-gray-700";

        return (
          <motion.div
            key={activity.name}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="rounded-xl"
          >
            <div
              className={`
                ${color}
                rounded-xl
                shadow-sm hover:shadow-md
                transition-all duration-200
                p-2
                border border-transparent
              `}
            >
              <QuickLogButton
                babyId={babyId}
                activityTypeName={activity.name}
                icon={icon}
                onActivityCreated={onActivityCreated}
              />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}