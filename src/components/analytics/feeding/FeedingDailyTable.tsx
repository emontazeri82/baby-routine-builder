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
    <Card>
      <div className="text-lg font-semibold mb-4">
        Daily Breakdown
      </div>

      <div className="space-y-2">
        {daily.map((d) => (
          <div
            key={d.date}
            className="flex justify-between border-b pb-2 text-sm"
          >
            <span>{d.date}</span>
            <span>{d.feeds} feeds</span>
            <span>{Math.round(d.totalIntakeMl)} ml</span>
            <span>{formatMinutes(d.totalDuration)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
