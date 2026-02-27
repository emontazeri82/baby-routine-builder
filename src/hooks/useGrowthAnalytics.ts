"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface GrowthResponse {
  records: any[];
  summary: any;
}

export default function useGrowthAnalytics(
  babyId: string,
  days?: number
) {
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!babyId) return;

    const fetchData = async () => {
      try {
        const url = days
          ? `/api/analytics/growth?babyId=${babyId}&days=${days}`
          : `/api/analytics/growth?babyId=${babyId}`;

        console.log("[Axios] Calling:", url);

        const res = await axios.get(url);

        setData(res.data); // ✅ store entire object
      } catch (err) {
        console.error("[Axios] Error:", err);
        setIsError(true);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [babyId, days]);

  return { data, isLoading, isError, error };
}

