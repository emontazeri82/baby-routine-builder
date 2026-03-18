"use client";

import { Card } from "@/components/ui/card";

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  daily: any[];
}

export default function FeedingDailyTable({ daily }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="text-lg font-semibold mb-4">
        Daily Breakdown
      </div>

      <div className="space-y-2 overflow-x-auto">
        {daily.map((d) => (
          <div
            key={d.date}
            className="grid min-w-[320px] grid-cols-2 gap-1 border-b pb-2 text-sm sm:grid-cols-4 sm:gap-2"
          >
            <span className="font-medium">{d.date}</span>
            <span className="text-right sm:text-left">{d.feeds} feeds</span>
            <span>{Math.round(d.totalIntakeMl)} ml</span>
            <span className="text-right sm:text-left">{formatMinutes(d.totalDuration)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
