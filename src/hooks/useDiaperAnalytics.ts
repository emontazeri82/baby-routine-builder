"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface DiaperAnalytics {
  summary: any;
  daily: any[];
  alerts: any[];
}

export function useDiaperAnalytics(
  babyId: string | undefined,
  days: number = 60
) {
  const [data, setData] = useState<DiaperAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!babyId) return;

    const url = `/api/analytics/diaper?babyId=${babyId}&days=${days}`;

    try {
      setLoading(true);
      setError(null);

      // ✅ AXIOS_URL
      console.log("[Axios] Calling:", url);

      const res = await axios.get(url);

      setData(res.data);
    } catch (err: any) {
      console.error("[Axios] Error at:", url, err);
      setError("Failed to load diaper analytics");
    } finally {
      setLoading(false);
    }
  }, [babyId, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
