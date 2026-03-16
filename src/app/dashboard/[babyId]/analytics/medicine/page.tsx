"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMedicineAnalytics } from "@/hooks/useMedicineAnalytics";

function formatHourLabel(value: string | number | null) {
  if (value === null || value === undefined) return "n/a";
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "n/a";
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${period}`;
}

function DistributionList({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((acc, [, count]) => acc + count, 0);

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>

        {sorted.length === 0 && (
          <p className="text-sm text-neutral-500">No data yet.</p>
        )}

        {sorted.map(([key, count]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize text-neutral-700">
                {key.replace(/_/g, " ")}
              </span>
              <span className="font-medium">
                {count} ({total ? Math.round((count / total) * 100) : 0}%)
              </span>
            </div>

            <div className="h-1.5 rounded bg-neutral-100">
              <div
                className="h-1.5 rounded bg-indigo-500"
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function MedicineAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const babyId = params.babyId as string;

  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  const { summary, daily, distributions, alerts, isLoading, isError } = useMedicineAnalytics(
    babyId,
    days
  );

  const maxDaily = useMemo(
    () => Math.max(...daily.map((d) => d.totalMedicines), 1),
    [daily]
  );

  if (isLoading) return <div className="p-6">Loading medicine analytics...</div>;
  if (isError || !summary) {
    return <div className="p-6">Failed to load medicine analytics.</div>;
  }

  const insights: string[] = [];
  if (summary.reactionsDetected > 0) {
    insights.push("Possible medicine reactions were recorded.");
  }
  if (summary.avgIntervalMinutes !== null && summary.avgIntervalMinutes < 120) {
    insights.push("Medicine doses may be too close together.");
  }
  if (summary.avgMedicinesPerDay >= 4) {
    insights.push("Medicine frequency is elevated this period.");
  }
  if (summary.mostCommonHour !== null) {
    insights.push(`Most doses happen around ${formatHourLabel(summary.mostCommonHour)}.`);
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Medicine Analytics</h1>
        <p className="text-neutral-500">Last {days} days overview</p>
      </div>

      <RangePresetSelector />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Medicines</p>
            <p className="text-2xl font-bold">{summary.totalMedicines}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg / Day</p>
            <p className="text-2xl font-bold">{summary.avgMedicinesPerDay.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Most Common</p>
            <p className="text-2xl font-bold">{summary.mostCommonMedicine ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Interval</p>
            <p className="text-2xl font-bold">
              {summary.avgIntervalMinutes !== null
                ? `${summary.avgIntervalMinutes} min`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Detected Reactions</p>
            <p className="text-2xl font-bold">{summary.reactionsDetected}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Medicine Insights</h2>

          {insights.length === 0 && (
            <p className="text-sm text-neutral-500">
              Medicine schedule looks balanced.
            </p>
          )}

          {insights.map((insight) => (
            <p key={insight} className="text-sm text-neutral-700">
              {insight}
            </p>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">
              Common Reason: {summary.mostCommonReason ?? "n/a"}
            </Badge>
            <Badge variant="outline">
              Common Method: {summary.mostCommonMethod ?? "n/a"}
            </Badge>
            <Badge variant="outline">
              Average Dose: {summary.averageDose ?? "n/a"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.type}-${index}`}
              className={`p-4 rounded-lg border ${
                alert.severity === "high"
                  ? "bg-red-50 border-red-300"
                  : alert.severity === "medium"
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-blue-50 border-blue-300"
              }`}
            >
              <p className="font-semibold capitalize">{alert.type}</p>
              <p className="text-sm text-gray-700">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          <h2 className="font-semibold">Daily Medicine Trend</h2>

          <p className="text-sm text-neutral-500 mb-4">
            Bars show how many medicine entries were logged each day.
          </p>

          {daily.length === 0 ? (
            <p className="text-sm text-neutral-500">No medicine data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-48 min-w-[520px]">
                {daily.map((d, index) => {
                  const labelStep = Math.max(1, Math.ceil(daily.length / 8));
                  const showLabel = index % labelStep === 0 || index === daily.length - 1;
                  const heightPercent = (d.totalMedicines / maxDaily) * 100;

                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center min-w-8 flex-1"
                    >
                      <div
                        className="w-full bg-indigo-500 rounded-t-md min-h-[4px]"
                        style={{
                          height:
                            heightPercent === 0 ? "4px" : `${heightPercent}%`,
                        }}
                        title={`${d.totalMedicines} medicine logs`}
                      />
                      <p className="text-xs mt-1 text-neutral-500 h-4">
                        {showLabel ? d.date.slice(5, 10) : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionList
          title="Medicine Name"
          values={distributions?.medicineName ?? {}}
        />
        <DistributionList
          title="Reason Distribution"
          values={distributions?.reason ?? {}}
        />
        <DistributionList
          title="Method Distribution"
          values={distributions?.method ?? {}}
        />
        <DistributionList
          title="Reaction Distribution"
          values={distributions?.reaction ?? {}}
        />
        <DistributionList
          title="Hour Distribution"
          values={Object.fromEntries(
            Object.entries(distributions?.hourOfDay ?? {}).map(([key, value]) => [
              formatHourLabel(key),
              value,
            ])
          )}
        />
      </div>
    </div>
  );
}
