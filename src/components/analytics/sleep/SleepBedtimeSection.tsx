"use client";

import { Card, CardContent } from "@/components/ui/card";

function formatClock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface Props {
  summary: any;
}

export default function SleepBedtimeSection({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Average Bedtime</p>
          <p className="text-xl font-semibold">
            {formatClock(summary.avgBedtimeMinutes)}
          </p>
          {summary.timezone && (
            <p className="text-xs text-muted-foreground mt-1">
              Timezone: {summary.timezone}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Average Wake Time</p>
          <p className="text-xl font-semibold">
            {formatClock(summary.avgWakeTimeMinutes)}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
