"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface DashboardStatsProps {
  babiesCount: number;
  todayCount: number;
  remindersCount: number;
}

export default function DashboardStats({
  babiesCount,
  todayCount,
  remindersCount,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Babies",
      value: babiesCount,
      emoji: "👶",
      color: "from-blue-500 to-indigo-500",
      text: "text-blue-600",
      glow: "from-blue-500/20",
    },
    {
      title: "Today’s Activities",
      value: todayCount,
      emoji: "📊",
      color: "from-green-500 to-emerald-500",
      text: "text-green-600",
      glow: "from-green-500/20",
    },
    {
      title: "Active Reminders",
      value: remindersCount,
      emoji: "⏰",
      color: "from-orange-500 to-red-500",
      text: "text-orange-600",
      glow: "from-orange-500/20",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      }}
      className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
    >
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  emoji,
  color,
  text,
  glow,
}: {
  title: string;
  value: number;
  emoji: string;
  color: string;
  text: string;
  glow: string;
}) {
  const [count, setCount] = useState(0);

  // 🔢 Smooth counting animation
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      whileHover={{
        y: -6,
        scale: 1.03,
      }}
      className="relative"
    >
      {/* 💫 Glow effect */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${glow} via-transparent to-transparent blur-xl opacity-0 hover:opacity-100 transition duration-500`}
      />

      <Card className="relative p-6 rounded-2xl border border-white/20 backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-md hover:shadow-xl transition-all duration-300">
        
        {/* 🧩 Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">{title}</p>
          <span className="text-xl">{emoji}</span>
        </div>

        {/* 🔢 Value */}
        <motion.p
          key={count}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl font-bold mt-4 ${text}`}
        >
          {count}
        </motion.p>

        {/* 📈 Colored underline */}
        <motion.div
          className={`h-[2px] bg-gradient-to-r ${color} mt-4 rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: "60%" }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />
      </Card>
    </motion.div>
  );
}