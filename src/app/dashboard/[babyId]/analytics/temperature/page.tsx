"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import { Card, CardContent } from "@/components/ui/card";

type TemperatureResponse = {
  daily: {
    date: string;
    avgTemperature: number | null;
    maxTemperature: number | null;
  }[];
  summary: {
    avgTemperature: number | null;
    maxTemperature: number | null;
    minTemperature: number | null;
    feverCount: number;
    highFeverCount: number;
    mostCommonHour: number | null;
  };
};

function formatHourLabel(value: number | null) {
  if (value === null) return "n/a";
  if (!Number.isInteger(value) || value < 0 || value > 23) return "n/a";
  const period = value >= 12 ? "PM" : "AM";
  const normalized = value % 12 === 0 ? 12 : value % 12;
  return `${normalized}:00 ${period}`;
}

async function fetchTemperatureAnalytics(
  babyId: string,
  days: number
): Promise<TemperatureResponse> {
  const res = await fetch(
    `/api/analytics/temperature?babyId=${babyId}&days=${days}`
  );
  if (!res.ok) throw new Error("Failed to load temperature analytics");
  return res.json();
}

export default function TemperatureAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const babyId = params.babyId as string;

  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  const { data, isLoading, isError } = useQuery<TemperatureResponse>({
    queryKey: ["temperature-analytics-detail", babyId, days],
    queryFn: () => fetchTemperatureAnalytics(babyId, days),
    enabled: !!babyId,
  });

  const daily = data?.daily ?? [];

  const maxDaily = useMemo(
    () => Math.max(...daily.map((d) => d.maxTemperature ?? 0), 1),
    [daily]
  );

  if (isLoading) return <div className="p-6">Loading temperature analytics...</div>;
  if (isError || !data) return <div className="p-6">Failed to load temperature analytics.</div>;

  const summary = data.summary;

  const insights: string[] = [];
  if (summary.highFeverCount > 0) {
    insights.push("High fever readings were detected in this range.");
  }
  if (summary.feverCount > 0) {
    insights.push(`Fever recorded ${summary.feverCount} time(s).`);
  }
  if (
    summary.avgTemperature !== null &&
    summary.avgTemperature > 0 &&
    summary.avgTemperature < 37.6
  ) {
    insights.push("Average temperature appears within normal range.");
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Temperature Analytics</h1>
        <p className="text-neutral-500">Last {days} days overview</p>
      </div>

      <RangePresetSelector />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Average Temperature</p>
            <p className="text-2xl font-bold">
              {summary.avgTemperature != null ? `${summary.avgTemperature.toFixed(1)}°` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Highest Temperature</p>
            <p className="text-2xl font-bold">
              {summary.maxTemperature != null ? `${summary.maxTemperature.toFixed(1)}°` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Lowest Temperature</p>
            <p className="text-2xl font-bold">
              {summary.minTemperature != null ? `${summary.minTemperature.toFixed(1)}°` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fever Count</p>
            <p className="text-2xl font-bold">{summary.feverCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">High Fever Count</p>
            <p className="text-2xl font-bold">{summary.highFeverCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Most Common Hour</p>
            <p className="text-2xl font-bold">{formatHourLabel(summary.mostCommonHour)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Temperature Insights</h2>

          {insights.length === 0 && (
            <p className="text-sm text-neutral-500">
              No critical temperature patterns detected.
            </p>
          )}

          {insights.map((insight) => (
            <p key={insight} className="text-sm text-neutral-700">
              {insight}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-semibold">Daily Temperature Trend</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Bars represent each day&apos;s maximum temperature.
          </p>

          {daily.length === 0 ? (
            <p className="text-sm text-neutral-500">No temperature data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-48 min-w-[520px]">
                {daily.map((d, index) => {
                  const labelStep = Math.max(1, Math.ceil(daily.length / 8));
                  const showLabel = index % labelStep === 0 || index === daily.length - 1;
                  const heightPercent = ((d.maxTemperature ?? 0) / maxDaily) * 100;

                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center min-w-8 flex-1"
                    >
                      <div
                        className="w-full bg-orange-500 rounded-t-md min-h-[4px]"
                        style={{
                          height: heightPercent === 0 ? "4px" : `${heightPercent}%`,
                        }}
                        title={`${d.maxTemperature ?? "n/a"}°`}
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
    </div>
  );
}
