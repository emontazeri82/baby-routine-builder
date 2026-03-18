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

        <div className="overflow-x-auto">
          <div
            className="flex h-48 min-w-[320px] items-end gap-3"
            style={{ minWidth: `${Math.max(320, daily.length * 42)}px` }}
          >
            {daily.map(d => {
              const heightPercent =
                (d.totalMinutes / maxDaily) * 100;

              return (
                <div
                  key={d.date}
                  className="flex w-full min-w-[30px] flex-col items-center"
                >
                  <div
                    className="w-full rounded-t-md bg-sky-400"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <p className="mt-2 text-xs">
                    {d.date.slice(5)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
