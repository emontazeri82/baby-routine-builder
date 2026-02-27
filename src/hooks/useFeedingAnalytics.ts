"use client";

import { useQuery } from "@tanstack/react-query";

export function useFeedingAnalytics(
  babyId: string,
  days: number = 7
) {
  return useQuery({
    queryKey: ["feedingAnalytics", babyId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/feeding?babyId=${babyId}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });
}
