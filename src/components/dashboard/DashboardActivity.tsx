"use client";

import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface Activity {
  id: string;
  startTime: Date | null;
}

export default function DashboardActivity({
  activities,
}: {
  activities: Activity[];
}) {
  return (
    <section>
      <h2 className="text-xl font-medium mb-4">
        Recent Activity
      </h2>

      {activities.length === 0 && (
        <p className="text-gray-500">
          No recent activities.
        </p>
      )}

      <div className="space-y-3">
        {activities.map((activity, i) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4">
              Activity started at{" "}
              {activity.startTime
                ? format(activity.startTime, "PPP p")
                : "Unknown"}
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
