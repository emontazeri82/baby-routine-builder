"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";

interface Props {
  daily: { date: string; totalMinutes: number }[];
}

export default function SleepTrendChart({ daily }: Props) {

  const maxDaily = useMemo(() => {
    return Math.max(...daily.map(d => d.totalMinutes), 1);
  }, [daily]);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-4">7-Day Sleep Trend</h2>

        <div className="flex items-end gap-3 h-48">
          {daily.map(d => {
            const heightPercent =
              (d.totalMinutes / maxDaily) * 100;

            return (
              <div
                key={d.date}
                className="flex flex-col items-center w-full"
              >
                <div
                  className="w-full bg-sky-400 rounded-t-md"
                  style={{ height: `${heightPercent}%` }}
                />
                <p className="text-xs mt-2">
                  {d.date.slice(5)}
                </p>
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
}
