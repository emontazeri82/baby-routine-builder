"use client";

import { Card, CardContent } from "@/components/ui/card";

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

interface Props {
  summary: any;
}

export default function SleepSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Avg Daily Sleep</p>
          <p className="text-2xl font-bold">
            {formatHours(summary.avgDailyMinutes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Night Sleep Ratio</p>
          <p className="text-2xl font-bold">
            {summary.nightRatioPercent.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Consistency Score</p>
          <p className="text-2xl font-bold">
            {summary.consistencyScore.toFixed(0)} / 100
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Longest Stretch</p>
          <p className="text-2xl font-bold">
            {formatHours(summary.longestStretchMinutes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Avg Sleep Session</p>
          <p className="text-2xl font-bold">
            {formatHours(summary.avgSleepSessionMinutes ?? summary.avgNapMinutes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Sleep Debt</p>
          <p className="text-2xl font-bold text-red-600">
            {formatHours(summary.sleepDebtMinutes)}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
