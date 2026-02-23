"use client";

import { useQuery } from "@tanstack/react-query";

export function useFeedingAnalytics(babyId: string) {
  return useQuery({
    queryKey: ["feedingAnalytics", babyId],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/feeding?babyId=${babyId}&days=7`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });
}
