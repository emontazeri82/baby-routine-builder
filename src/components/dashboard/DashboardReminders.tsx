"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Reminder {
  id: string;
  title: string | null;
}

export default function DashboardReminders({
  reminders,
}: {
  reminders: Reminder[];
}) {
  return (
    <section>
      <h2 className="text-xl font-medium mb-4">
        Upcoming Reminders
      </h2>

      {reminders.length === 0 && (
        <p className="text-gray-500">
          No reminders scheduled.
        </p>
      )}

      <div className="space-y-3">
        {reminders.map((reminder, i) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4">
              {reminder.title || "Untitled Reminder"}
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
