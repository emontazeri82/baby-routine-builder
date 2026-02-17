"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Activity = {
  id: string;
  startTime: Date | null;
};

export default function DashboardChart({
  activities,
}: {
  activities: Activity[];
}) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  /* -------------------------
     Build last 7 days dataset
  -------------------------- */

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const label = format(date, "EEE");

      const count = activities.filter(
        (activity) =>
          activity.startTime &&
          format(new Date(activity.startTime), "yyyy-MM-dd") ===
          format(date, "yyyy-MM-dd")
      ).length;

      return {
        date,
        label,
        count,
        isToday: isToday(date),
      };
    });
  }, [activities]);

  const totalWeek = chartData.reduce((acc, d) => acc + d.count, 0);

  const maxDay =
    chartData.length > 0
      ? chartData.reduce((max, d) =>
        d.count > max.count ? d : max
      )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Weekly Activity Trend
            </h2>
            <p className="text-sm text-neutral-500">
              Last 7 days overview
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              Bar
            </Button>

            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              Line
            </Button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="flex gap-4 text-sm">
          <Badge variant="secondary">
            {totalWeek} activities this week
          </Badge>

          {maxDay && (
            <Badge variant="secondary">
              Peak: {maxDay.label} ({maxDay.count})
            </Badge>
          )}
        </div>

        {/* CHART */}
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="#111827"
                />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#111827"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}
