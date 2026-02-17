"use client";

import { motion } from "framer-motion";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Header Skeleton */}
        <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="h-72 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />

        {/* Activity Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
