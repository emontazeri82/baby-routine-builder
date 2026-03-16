"use client";

import { useEffect, useState, useCallback } from "react";

export type PlayAnalyticsSummary = {
  totalSessions: number;
  totalMinutes: number;
  averageMinutes: number;
  longestSessionMinutes: number;
  shortestSessionMinutes: number;
  mostCommonPlayType: string | null;
  mostActiveHour: number | null;
  mostCommonLocation: string | null;
  topSkill: string | null;
  uniquePlayTypes: number;
  uniqueSkillsPracticed: number;
  outdoorPlayRatioPercent: number;
  activePlayRatioPercent: number;
  happyPlayRatioPercent: number;
  activeDays: number;
  averageSessionsPerActiveDay: number;
  averageSkillsPerSession: number;
  playVarietyScore: number;
  consistencyScore: number;
  engagementScore: number;
  motorScore: number;
  cognitiveScore: number;
  socialScore: number;
  languageScore: number;
  sensoryScore: number;
  bestPlayDay: string | null;
  worstPlayDay: string | null;
};

export type PlayAnalyticsDistributions = {
  playType: Record<string, number>;
  location: Record<string, number>;
  mood: Record<string, number>;
  intensity: Record<string, number>;
  skills: Record<string, number>;
  hourOfDay: Record<number, number>;
};

export type PlayAnalyticsData = {
  summary: PlayAnalyticsSummary;
  daily: {
    date: string;
    sessions: number;
    totalMinutes: number;
  }[];
  distributions: PlayAnalyticsDistributions;
};

type Options = {
  babyId: string;
  days?: number;
  startDate?: string;
  endDate?: string;
};

export function usePlayAnalytics({ babyId, days, startDate, endDate }: Options) {

  const [data, setData] = useState<PlayAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {

    if (!babyId) return;

    setLoading(true);
    setError(null);

    try {

      const params = new URLSearchParams({
        babyId,
      });

      if (typeof days === "number") params.append("days", String(days));
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);

      const res = await fetch(`/api/analytics/play?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load play analytics");
      }

      const json = await res.json();

      setData(json);

    } catch (err) {

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error");
      }

    } finally {
      setLoading(false);
    }

  }, [babyId, days, startDate, endDate]);

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
