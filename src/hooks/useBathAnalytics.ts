"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type BathAnalyticsParams = {
  babyId: string;
  startDate: string;
  endDate: string;
};

type BathAnalyticsData = {
  summary: {
    totalBaths: number;
    averageBathsPerDay: number;
    weeklyFrequency: number;
    mostCommonBathHour: number | null;
    averageTemperature: number | null;
    moodImproved: number;
    moodWorsened: number;
  };
  distributions: {
    bathType: Record<string, number>;
    location: Record<string, number>;
    moodBefore: Record<string, number>;
    moodAfter: Record<string, number>;
    hourOfDay: Record<string, number>;
  };
  daily: {
    date: string;
    totalBaths: number;
  }[];
};

export function useBathAnalytics({
  babyId,
  startDate,
  endDate,
}: BathAnalyticsParams) {
  const [data, setData] = useState<BathAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/analytics/bath?babyId=${babyId}&startDate=${startDate}&endDate=${endDate}`;

      // ✅ AXIOS_URL
      console.log("[Axios] Calling:", url);

      const response = await axios.get(url);

      setData(response.data);
    } catch (err) {
      console.error("[Axios] Error at:", "/api/analytics/bath", err);
      setError("Failed to load bath analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!babyId || !startDate || !endDate) return;

    fetchAnalytics();
  }, [babyId, startDate, endDate]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}