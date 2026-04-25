"use client";

import { motion } from "framer-motion";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 🌈 BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-neutral-950 dark:via-purple-950/40 dark:to-indigo-950/40" />

      {/* 🔥 BLOBS */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl animate-pulse" />

      {/* 📦 ANIMATED CONTENT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-6xl mx-auto px-6 py-10 space-y-10"
      >
        <div className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border rounded-3xl shadow-xl p-6 space-y-10">
          {children}
        </div>
      </motion.div>
    </div>
  );
}