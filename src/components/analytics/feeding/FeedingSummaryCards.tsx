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

export default function FeedingSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

      <Card>
        <div className="text-sm text-neutral-500">Total Feeds</div>
        <div className="text-2xl font-semibold">
          {summary.totalFeeds}
        </div>
      </Card>

      <Card>
        <div className="text-sm text-neutral-500">
          Avg Feeds / Day
        </div>
        <div className="text-2xl font-semibold">
          {summary.avgFeedsPerDay.toFixed(1)}
        </div>
      </Card>

      <Card>
        <div className="text-sm text-neutral-500">
          Avg Intake / Day
        </div>
        <div className="text-2xl font-semibold">
          {Math.round(summary.avgIntakePerDayMl)} ml
        </div>
      </Card>

      <Card>
        <div className="text-sm text-neutral-500">
          Predicted Next Feed
        </div>
        <div className="text-2xl font-semibold">
          {summary.predictedNextFeedInMinutes !== null
            ? formatMinutes(summary.predictedNextFeedInMinutes)
            : "—"}
        </div>
      </Card>

    </div>
  );
}
