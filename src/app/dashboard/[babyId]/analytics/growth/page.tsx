"use client";

import { useParams, useSearchParams } from "next/navigation";
import GrowthSummaryCards from "@/components/analytics/growth/GrowthSummaryCards";
import GrowthCharts from "@/components/analytics/growth/GrowthCharts";
import useGrowthAnalytics from "@/hooks/useGrowthAnalytics";

export default function GrowthAnalyticsPage() {
  const { babyId } = useParams() as { babyId: string };
  const searchParams = useSearchParams();
  const daysParam = searchParams.get("days");
  const rawDays = daysParam ? Number(daysParam) : NaN;
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : undefined;

  const { data, isLoading, isError, error } =
    useGrowthAnalytics(babyId, days);

  if (isLoading) return <div className="p-6">Loading growth analytics...</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-red-500">
        {error instanceof Error
          ? error.message
          : "Failed to load growth analytics."}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">
        Growth Analytics {days ? `(${days} Days)` : "(All Days)"}
      </h1>

      <GrowthSummaryCards summary={data.summary} />
      <GrowthCharts data={data.records} />
    </div>
  );
}
