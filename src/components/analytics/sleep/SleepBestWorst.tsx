"use client";

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  summary: any;
}

export default function SleepBestWorst({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Best Sleep Day</p>
          <p className="text-lg font-semibold">
            {summary.bestSleepDay}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Worst Sleep Day</p>
          <p className="text-lg font-semibold">
            {summary.worstSleepDay}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
