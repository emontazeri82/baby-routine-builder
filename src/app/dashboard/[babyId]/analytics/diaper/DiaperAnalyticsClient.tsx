"use client";

import { useEffect, useMemo } from "react";
import { useDiaperAnalytics } from "@/hooks/useDiaperAnalytics";

export default function DiaperAnalyticsClient({
  babyId,
}: {
  babyId: string;
}) {
  const { data, loading, error, refetch } =
    useDiaperAnalytics(babyId, 60);

  const maxDaily = useMemo(() => {
    if (!data?.daily?.length) return 1;
    return Math.max(
      ...data.daily.map((d: any) => Number(d.total) || 0),
      1
    );
  }, [data]);
  const hasAnyDiaperCount = useMemo(() => {
    if (!data?.daily?.length) return false;
    return data.daily.some((d: any) => Number(d.total) > 0);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    console.log("[DIAPER CLIENT DEBUG]", {
      dailyPoints: data.daily?.length ?? 0,
      maxDaily,
      hasAnyDiaperCount,
      firstDaily: data.daily?.[0] ?? null,
      lastDaily:
        data.daily?.[data.daily.length - 1] ?? null,
      sampleTotals:
        data.daily?.slice(0, 10).map((d: any) => ({
          date: d.date,
          total: d.total,
        })) ?? [],
    });
  }, [data, hasAnyDiaperCount, maxDaily]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading diaper analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, daily, alerts } = data;

  const today = daily[daily.length - 1] || {};
  console.log(
    daily.map(d => ({
      date: d.date,
      total: d.total
    }))
  );

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Diaper Analytics
          </h1>
          <p className="text-gray-500">
            60-day diaper trends and health insights
          </p>
        </div>

        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts?.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${alert.severity === "high"
                ? "bg-red-50 border-red-300"
                : alert.severity === "medium"
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-blue-50 border-blue-300"
                }`}
            >
              <p className="font-semibold capitalize">
                {alert.type}
              </p>
              <p className="text-sm text-gray-700">
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Avg Total / Day"
            value={summary.avgTotal.toFixed(1)}
          />
          <MetricCard
            title="Avg Wet / Day"
            value={summary.avgWet.toFixed(1)}
          />
          <MetricCard
            title="Avg Dirty / Day"
            value={summary.avgDirty.toFixed(1)}
          />
          <MetricCard
            title="Avg Rash / Day"
            value={summary.avgRash.toFixed(1)}
          />
        </div>
      )}

      {/* Daily Chart */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Daily Diaper Activity
        </h2>

        {daily.length === 0 ? (
          <p className="text-gray-500">
            No diaper data available.
          </p>
        ) : !hasAnyDiaperCount ? (
          <p className="text-gray-500">
            Diaper data exists, but all daily totals are 0 for this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: daily.length * 28 }}>
              <div className="flex items-end gap-2 h-44 border-b border-gray-300 bg-gray-50 px-2">
                {daily.map((d: any) => {
                  const total = Number(d.total) || 0;
                  const barHeightPx =
                    maxDaily > 0
                      ? Math.max(4, (total / maxDaily) * 140)
                      : 4;

                  return (
                    <div
                      key={d.date}
                      className="w-5 sm:w-4 shrink-0 h-full flex items-end"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[4px]"
                        style={{ height: `${barHeightPx}px` }}
                        title={`${d.date}: ${total}`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 px-2 pt-1">
                {daily.map((d: any, index: number) => {
                  const labelStep = Math.max(
                    1,
                    Math.ceil(daily.length / 10)
                  );
                  const showLabel =
                    index % labelStep === 0 ||
                    index === daily.length - 1;

                  return (
                    <div
                      key={`${d.date}-label`}
                      className="w-5 sm:w-4 shrink-0 text-center"
                    >
                      <span className="text-xs text-gray-500">
                        {showLabel ? d.date.slice(5) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Today Breakdown
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard title="Wet" value={today.wet ?? 0} />
          <MetricCard title="Dirty" value={today.dirty ?? 0} />
          <MetricCard title="Watery" value={today.watery ?? 0} />
          <MetricCard title="Hard" value={today.hard ?? 0} />
          <MetricCard title="Rash" value={today.rash ?? 0} />
        </div>
      </div>

    </div>
  );
}

/* -------- Reusable Card -------- */

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
