"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-neutral-900 p-8 rounded-xl shadow-lg text-center max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-red-500">
          Something went wrong
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          We couldn't load your dashboard.
          Please try again.
        </p>

        <Button onClick={reset}>
          Try Again
        </Button>
      </motion.div>
    </div>
  );
}
