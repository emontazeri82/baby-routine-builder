"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Bell,
  Baby,
  BarChart3,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardQuickActions({
  babyId,
}: {
  babyId: string;
}) {
  const router = useRouter();

  const actions = [
    {
      label: "Activity",
      icon: Plus,
      onClick: () =>
        router.push(`/dashboard/${babyId}/activities/new`),
      color: "from-indigo-500 to-purple-500",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      text: "text-indigo-600 dark:text-indigo-300",
    },
    {
      label: "Reminder",
      icon: Bell,
      onClick: () =>
        router.push(`/dashboard/${babyId}/reminders/new`),
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-300",
    },
    {
      label: "Baby",
      icon: Baby,
      onClick: () =>
        router.push("/dashboard/babies/new"),
      color: "from-pink-500 to-rose-500",
      bg: "bg-pink-50 dark:bg-pink-500/10",
      text: "text-pink-600 dark:text-pink-300",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      onClick: () =>
        router.push(`/dashboard/${babyId}/analytics`),
      color: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => router.push("/dashboard/settings"),
      color: "from-neutral-500 to-neutral-700",
      bg: "bg-neutral-100 dark:bg-neutral-500/10",
      text: "text-neutral-700 dark:text-neutral-300",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full flex justify-center"
    >
      {/* 👇 THIS WRAPPER FIXES EVERYTHING */}
      <div
        className="
      flex gap-3
      w-fit mx-auto
      max-w-full
      overflow-x-auto
      px-2 py-2
      [scrollbar-width:none]
      [-ms-overflow-style:none]
      [&::-webkit-scrollbar]:hidden
    "
      >
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              onClick={action.onClick}
              className={`
            group relative
            flex flex-col items-center justify-center
            min-w-[88px] h-20
            rounded-2xl
            ${action.bg}
            border border-white/20
            backdrop-blur-xl
            shadow-[0_6px_20px_rgba(0,0,0,0.06)]
            
            hover:-translate-y-[3px]
            hover:shadow-[0_12px_35px_rgba(0,0,0,0.12)]
            active:scale-[0.95]
            transition-all duration-200
          `}
            >
              {/* Glow effect */}
              <div
                className={`
              absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
              bg-gradient-to-r ${action.color}
              blur-2xl transition duration-300
            `}
              />

              {/* Icon */}
              <div
                className={`
              relative z-10
              w-10 h-10 rounded-xl
              flex items-center justify-center
              bg-gradient-to-r ${action.color}
              text-white
              shadow-md
              group-hover:scale-110
              transition-transform duration-200
            `}
              >
                <action.icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <span
                className={`
              relative z-10 text-[11px] mt-1 font-medium
              ${action.text}
            `}
              >
                {action.label}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}