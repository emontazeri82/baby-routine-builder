"use client";

import { Card } from "@/components/ui/card";

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  summary: any;
}

export default function FeedingIntervalSection({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <Card>
        <div className="text-sm text-neutral-500">
          Avg Interval
        </div>
        <div className="text-xl font-semibold">
          {formatMinutes(summary.avgIntervalMinutes)}
        </div>
      </Card>

      <Card>
        <div className="text-sm text-neutral-500">
          Longest Gap
        </div>
        <div className="text-xl font-semibold">
          {formatMinutes(summary.longestGapMinutes)}
        </div>
      </Card>

      <Card>
        <div className="text-sm text-neutral-500">
          Avg Feed Duration
        </div>
        <div className="text-xl font-semibold">
          {formatMinutes(summary.avgFeedDurationMinutes)}
        </div>
      </Card>

    </div>
  );
}
