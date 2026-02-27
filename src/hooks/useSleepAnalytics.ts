"use client";

import { useQuery } from "@tanstack/react-query";

export function useSleepAnalytics(
  babyId: string,
  days: number = 7
) {
  return useQuery({
    queryKey: ["sleep-analytics", babyId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/sleep?babyId=${babyId}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}
