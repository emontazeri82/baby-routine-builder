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

export default function DashboardQuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "Add Activity",
      icon: Plus,
      onClick: () => router.push("/dashboard/activities/new"),
    },
    {
      label: "Add Reminder",
      icon: Bell,
      onClick: () => router.push("/dashboard/reminders/new"),
    },
    {
      label: "Add Baby",
      icon: Baby,
      onClick: () => router.push("/dashboard/babies/new"),
    },
    {
      label: "Analytics",
      icon: BarChart3,
      onClick: () => router.push("/dashboard/analytics"),
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => router.push("/dashboard/settings"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 md:grid-cols-5 gap-4"
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          onClick={action.onClick}
          className="flex flex-col items-center gap-2 h-20 hover:shadow-md transition-all"
        >
          <action.icon className="w-5 h-5" />
          <span className="text-xs">
            {action.label}
          </span>
        </Button>
      ))}
    </motion.div>
  );
}
