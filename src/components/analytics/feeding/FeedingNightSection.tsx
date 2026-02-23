"use client";

import { Card } from "@/components/ui/card";

interface Props {
  summary: any;
}

export default function FeedingNightSection({ summary }: Props) {
  return (
    <Card>
      <div className="text-lg font-semibold mb-4">
        Night Feeding
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div>
          <div className="text-sm text-neutral-500">
            Night Feeds
          </div>
          <div className="text-xl font-semibold">
            {summary.nightFeedsCount}
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-500">
            Night Feed %
          </div>
          <div className="text-xl font-semibold">
            {summary.nightFeedRatioPercent.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-sm text-neutral-500">
            Night Intake
          </div>
          <div className="text-xl font-semibold">
            {Math.round(summary.nightIntakeMl)} ml
          </div>
        </div>

      </div>
    </Card>
  );
}
