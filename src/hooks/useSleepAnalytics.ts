"use client";

import { useQuery } from "@tanstack/react-query";

export function useSleepAnalytics(babyId: string) {
  return useQuery({
    queryKey: ["sleep-analytics", babyId],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/sleep?babyId=${babyId}&days=7`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}
