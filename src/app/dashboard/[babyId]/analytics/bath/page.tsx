"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import { useBathAnalytics } from "@/hooks/useBathAnalytics";

function formatHourLabel(value: string | number | null) {
  if (!value) return "n/a";

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
                className="h-1.5 rounded bg-blue-500"
                style={{
                  width: `${total ? (count / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function BathAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const babyId = params.babyId as string;

  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);

  const days = allowedDays.has(rawDays) ? rawDays : 7;

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);

    start.setDate(start.getDate() - (days - 1));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [days]);

  const { data, loading, error } = useBathAnalytics({
    babyId,
    startDate,
    endDate,
  });

  if (loading) return <div className="p-6">Loading bath analytics...</div>;

  if (error || !data)
    return (
      <div className="p-6 text-red-500">Failed to load bath analytics.</div>
    );

  const summary = data.summary;
  const distributions = data.distributions;
  const daily = data.daily;

  const maxDailyBaths = Math.max(...daily.map((d) => d.totalBaths), 1);

  const insights: string[] = [];

  if (summary.weeklyFrequency < 3) {
    insights.push("Bath frequency is lower than typical routines.");
  }

  if (summary.moodImproved > summary.moodWorsened) {
    insights.push("Baby mood often improves after bath.");
  }

  if (summary.mostCommonBathHour !== null) {
    insights.push(
      `Baths usually happen around ${formatHourLabel(
        summary.mostCommonBathHour
      )}.`
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}

      <div>
        <h1 className="text-3xl font-bold">Bath Analytics</h1>
        <p className="text-neutral-500">Last {days} days overview</p>
      </div>

      <RangePresetSelector />

      {/* Summary Cards */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Baths</p>
            <p className="text-2xl font-bold">{summary.totalBaths}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Average Baths / Day
            </p>
            <p className="text-2xl font-bold">{summary.averageBathsPerDay}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Weekly Frequency</p>
            <p className="text-2xl font-bold">{summary.weeklyFrequency}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Most Common Time</p>
            <p className="text-2xl font-bold">
              {formatHourLabel(summary.mostCommonBathHour)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Temperature</p>
            <p className="text-2xl font-bold">
              {summary.averageTemperature ?? "n/a"}°
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Bath Insights</h2>

          {insights.length === 0 && (
            <p className="text-sm text-neutral-500">
              Bath routine looks balanced.
            </p>
          )}

          {insights.map((insight) => (
            <p key={insight} className="text-sm text-neutral-700">
              {insight}
            </p>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">
              Mood Improved: {summary.moodImproved}
            </Badge>

            <Badge variant="outline">
              Mood Worsened: {summary.moodWorsened}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend */}

      <Card>
        <CardContent>
          <h2 className="font-semibold">Daily Bath Trend</h2>

          <p className="text-sm text-neutral-500 mb-4">
            Bars show how many baths were logged each day.
          </p>

          {daily.length === 0 ? (
            <p className="text-sm text-neutral-500">No bath data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-48 min-w-[520px]">
                {daily.map((d, index) => {
                  const labelStep = Math.max(
                    1,
                    Math.ceil(daily.length / 8)
                  );

                  const showLabel =
                    index % labelStep === 0 ||
                    index === daily.length - 1;

                  const heightPercent =
                    (d.totalBaths / maxDailyBaths) * 100;

                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center min-w-8 flex-1"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t-md min-h-[4px]"
                        style={{
                          height:
                            heightPercent === 0
                              ? "4px"
                              : `${heightPercent}%`,
                        }}
                        title={`${d.totalBaths} baths`}
                      />

                      <p className="text-xs mt-1 text-neutral-500 h-4">
                        {showLabel ? d.date.slice(5) : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distributions */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionList
          title="Bath Type"
          values={distributions.bathType}
        />

        <DistributionList
          title="Location"
          values={distributions.location}
        />

        <DistributionList
          title="Mood Before Bath"
          values={distributions.moodBefore}
        />

        <DistributionList
          title="Mood After Bath"
          values={distributions.moodAfter}
        />

        <DistributionList
          title="Bath Hour Distribution"
          values={Object.fromEntries(
            Object.entries(distributions.hourOfDay).map(
              ([key, value]) => [formatHourLabel(key), value]
            )
          )}
        />
      </div>
    </div>
  );
}