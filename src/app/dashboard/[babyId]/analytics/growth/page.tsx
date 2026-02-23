"use client";

import { useParams } from "next/navigation";
import GrowthSummaryCards from "@/components/analytics/growth/GrowthSummaryCards";
import GrowthCharts from "@/components/analytics/growth/GrowthCharts";
import useGrowthAnalytics from "@/hooks/useGrowthAnalytics";

export default function GrowthAnalyticsPage() {
  const { babyId } = useParams() as { babyId: string };

  const { data, loading, error } = useGrowthAnalytics(babyId);

  if (loading) return <div className="p-6">Loading growth analytics...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Growth Analytics</h1>

      <GrowthSummaryCards data={data} />
      <GrowthCharts data={data} />
    </div>
  );
}
