"use client";

import { useMemo } from "react";
import { TemperatureService, TemperatureInput } from "@/services/analytics/temperatureService";

export interface TemperatureActivity {
  id: string;
  createdAt: string;
  metadata: {
    value?: number;
    unit: "C" | "F";
  };
}

export interface TemperatureAnalytics {
  readings: number[];
  averageC: number | null;
  highestC: number | null;
  lowestC: number | null;
  feverCount: number;
  latestStatus: string | null;
}

export function useTemperatureAnalytics(
  activities: TemperatureActivity[]
): TemperatureAnalytics {
  return useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        readings: [],
        averageC: null,
        highestC: null,
        lowestC: null,
        feverCount: 0,
        latestStatus: null,
      };
    }

    const normalizedTemps: number[] = [];
    let feverCount = 0;

    for (const activity of activities) {
      const input: TemperatureInput = {
        value: activity.metadata?.value,
        unit: activity.metadata?.unit ?? "C",
      };

      const normalized = TemperatureService.normalize(input);

      if (!normalized) continue;

      const c = normalized.valueC;

      normalizedTemps.push(c);

      if (TemperatureService.isFever(input)) {
        feverCount++;
      }
    }

    if (normalizedTemps.length === 0) {
      return {
        readings: [],
        averageC: null,
        highestC: null,
        lowestC: null,
        feverCount,
        latestStatus: null,
      };
    }

    const sum = normalizedTemps.reduce((a, b) => a + b, 0);

    const averageC = sum / normalizedTemps.length;

    const highestC = Math.max(...normalizedTemps);

    const lowestC = Math.min(...normalizedTemps);

    const latestActivity = activities[activities.length - 1];

    const latestStatus = latestActivity
      ? TemperatureService.classify({
          value: latestActivity.metadata?.value,
          unit: latestActivity.metadata?.unit ?? "C",
        })
      : null;

    return {
      readings: normalizedTemps,
      averageC,
      highestC,
      lowestC,
      feverCount,
      latestStatus,
    };
  }, [activities]);
}
