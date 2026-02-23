"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function useGrowthAnalytics(babyId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!babyId) return;

    const fetchData = async () => {
      try {
        const url = `/api/analytics/growth?babyId=${babyId}`;
        console.log("[Axios] Calling:", url);

        const res = await axios.get(url);

        setData(res.data.data || []);
      } catch (err) {
        console.error("[Axios] Error:", err);
        setError("Failed to load growth analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [babyId]);

  return { data, loading, error };
}
