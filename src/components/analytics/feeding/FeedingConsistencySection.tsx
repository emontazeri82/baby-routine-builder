"use client";

import { Card } from "@/components/ui/card";

interface Props {
  summary: any;
}

export default function FeedingConsistencySection({ summary }: Props) {
  return (
    <Card>
      <div className="text-sm text-neutral-500">
        Feeding Consistency Score
      </div>

      <div className="text-2xl font-semibold">
        {summary.feedingConsistencyScore.toFixed(0)} / 100
      </div>

      {summary.clusterFeedingDetected && (
        <div className="text-sm text-amber-600 mt-2">
          Cluster feeding pattern detected
        </div>
      )}
    </Card>
  );
}
