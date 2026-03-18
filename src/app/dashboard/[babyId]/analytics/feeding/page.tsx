"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useFeedingAnalytics } from "@/hooks/useFeedingAnalytics";

import FeedingSummaryCards from "@/components/analytics/feeding/FeedingSummaryCards";
import FeedingIntervalSection from "@/components/analytics/feeding/FeedingIntervalSection";
import FeedingNightSection from "@/components/analytics/feeding/FeedingNightSection";
import FeedingConsistencySection from "@/components/analytics/feeding/FeedingConsistencySection";
import FeedingDailyTable from "@/components/analytics/feeding/FeedingDailyTable";

export default function FeedingAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const babyId = params.babyId as string;
  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  const { data, isLoading, error } =
    useFeedingAnalytics(babyId, days);

  if (isLoading) return <div className="p-4 sm:p-6 lg:p-8">Loading...</div>;
  if (error || !data)
    return <div className="p-4 text-red-500 sm:p-6 lg:p-8">Failed to load data</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Feeding Analytics
        </h1>
        <p className="text-neutral-500">
          Last {days} Days Overview
        </p>
      </div>

      <FeedingSummaryCards summary={data.summary} />
      <FeedingIntervalSection summary={data.summary} />
      <FeedingNightSection summary={data.summary} />
      <FeedingConsistencySection summary={data.summary} />
      <FeedingDailyTable daily={data.daily} />

    </div>
  );
}
