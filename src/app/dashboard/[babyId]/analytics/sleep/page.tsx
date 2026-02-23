
"use client";

import { useParams } from "next/navigation";
import { useSleepAnalytics } from "@/hooks/useSleepAnalytics";
import SleepSummaryCards from "@/components/analytics/sleep/SleepSummaryCards";
import SleepBedtimeSection from "@/components/analytics/sleep/SleepBedtimeSection";
import SleepTrendChart from "@/components/analytics/sleep/SleepTrendChart";
import SleepBestWorst from "@/components/analytics/sleep/SleepBestWorst";

export default function SleepAnalyticsPage() {
  const params = useParams();
  const babyId = params.babyId as string;

  const { data, isLoading } = useSleepAnalytics(babyId);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data?.summary)
    return <div className="p-8">Failed to load sleep analytics.</div>;

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Sleep Analytics</h1>

      <SleepSummaryCards summary={data.summary} />
      <SleepBedtimeSection summary={data.summary} />
      <SleepTrendChart daily={data.daily} />
      <SleepBestWorst summary={data.summary} />

    </div>
  );
}
