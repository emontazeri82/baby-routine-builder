"use client";

import { useMemo } from "react";

export type NapLocation = "crib" | "stroller" | "car" | "parent";
export type NapQuality = "good" | "fair" | "poor";

export interface NapMetadata {
  location?: NapLocation;
  quality?: NapQuality;
  assisted?: boolean;
}

export interface NapActivity {
  id: string;
  startTime: string;
  endTime?: string | null;
  metadata?: NapMetadata;
}

export interface NapAnalytics {
  totalNaps: number;
  avgNapsPerDay: number;
  assistedCount: number;
  assistedRatio: number;
  qualityScore: number;
  mostCommonLocation: NapLocation | null;
  mostCommonQuality: NapQuality | null;
}

export function useNapAnalytics(
  activities: NapActivity[],
  days: number
): NapAnalytics {

  return useMemo(() => {

    if (!activities || activities.length === 0) {
      return {
        totalNaps: 0,
        avgNapsPerDay: 0,
        assistedCount: 0,
        assistedRatio: 0,
        qualityScore: 0,
        mostCommonLocation: null,
        mostCommonQuality: null,
      };
    }

    let assistedCount = 0;

    const locationCount: Record<string, number> = {};
    const qualityCount: Record<string, number> = {};

    const qualityScoreMap: Record<NapQuality, number> = {
      good: 100,
      fair: 60,
      poor: 30,
    };

    let qualityTotal = 0;
    let qualitySamples = 0;

    for (const activity of activities) {

      const meta = activity.metadata ?? {};

      if (meta.assisted) {
        assistedCount++;
      }

      if (meta.location) {
        locationCount[meta.location] =
          (locationCount[meta.location] ?? 0) + 1;
      }

      if (meta.quality) {
        qualityCount[meta.quality] =
          (qualityCount[meta.quality] ?? 0) + 1;

        qualityTotal += qualityScoreMap[meta.quality];
        qualitySamples++;
      }
    }

    const mostCommon = (map: Record<string, number>) => {
      const entries = Object.entries(map);

      if (!entries.length) return null;

      return entries.sort((a, b) => b[1] - a[1])[0][0];
    };

    const totalNaps = activities.length;

    const qualityScore =
      qualitySamples > 0
        ? Math.round(qualityTotal / qualitySamples)
        : 0;

    return {
      totalNaps,
      avgNapsPerDay: totalNaps / days,
      assistedCount,
      assistedRatio: totalNaps > 0 ? assistedCount / totalNaps : 0,
      qualityScore,
      mostCommonLocation: mostCommon(locationCount) as NapLocation | null,
      mostCommonQuality: mostCommon(qualityCount) as NapQuality | null,
    };

  }, [activities, days]);
}