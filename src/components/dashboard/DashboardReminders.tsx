"use client";

import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

interface Reminder {
  id: string;
  title: string | null;
  remindAt: string | Date;
}

export default function DashboardReminders({
  reminders,
}: {
  reminders: Reminder[];
}) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          Upcoming Reminders
        </h2>

        <span className="text-xs text-neutral-500">
          {reminders.length} total
        </span>
      </div>

      <AnimatePresence mode="wait">
        {reminders.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-neutral-500 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl p-4 text-center"
          >
            No reminders scheduled.
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.08 },
              },
            }}
            className="space-y-3"
          >
            {reminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const title = reminder.title?.trim() || "Untitled Reminder";
  const date = new Date(reminder.remindAt);

  const now = new Date();
  const isPast = date < now;
  const isSoon = date.getTime() - now.getTime() < 1000 * 60 * 60 * 2; // < 2h

  // 🎯 Status color
  let statusColor = "bg-emerald-400";
  if (isPast) statusColor = "bg-red-500";
  else if (isSoon) statusColor = "bg-yellow-400";

  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />

      <Card className="relative p-4 rounded-2xl border border-white/20 backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-sm group-hover:shadow-lg transition-all duration-300">
        
        {/* Top Row */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {title}
          </p>

          {/* Status Dot */}
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        </div>

        {/* Time Info */}
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {format(date, "EEE • h:mm a")}
          </span>

          <span>
            {isPast
              ? "Overdue"
              : formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>

        {/* Animated underline */}
        <motion.div
          className="mt-3 h-[2px] bg-gradient-to-r from-indigo-400 to-pink-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: "50%" }}
          transition={{ duration: 0.4 }}
        />
      </Card>
    </motion.div>
  );
}