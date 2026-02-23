// lib/analytics/growth.ts

import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { and, eq, asc, isNotNull, sql } from "drizzle-orm";

/* ============================= */
/*            TYPES              */
/* ============================= */

export interface RawGrowthRow {
  date: Date;
  weight: number | null;
  height: number | null;
  headCircumference: number | null;
}

export interface GrowthAnalyticsRow extends RawGrowthRow {
  weightGain: number | null;
  weeklyWeightRate: number | null;
}

/* ============================= */
/*        DATA FETCH LAYER       */
/* ============================= */

export async function fetchGrowthMeasurements(
  babyId: string,
  growthActivityTypeId: string
): Promise<RawGrowthRow[]> {
  const rows = await db
    .select({
      date: activities.startTime,
      weight: sql<number | null>`
        CASE 
          WHEN metadata ? 'weight' 
          THEN (metadata->>'weight')::float 
          ELSE NULL 
        END
      `,
      height: sql<number | null>`
        CASE 
          WHEN metadata ? 'height' 
          THEN (metadata->>'height')::float 
          ELSE NULL 
        END
      `,
      headCircumference: sql<number | null>`
        CASE 
          WHEN metadata ? 'headCircumference' 
          THEN (metadata->>'headCircumference')::float 
          ELSE NULL 
        END
      `,
    })
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activities.activityTypeId, growthActivityTypeId),
        isNotNull(activities.startTime)
      )
    )
    .orderBy(asc(activities.startTime));

  return rows;
}

/* ============================= */
/*       ANALYTICS ENGINE        */
/* ============================= */

export function computeGrowthAnalytics(
  rows: RawGrowthRow[]
): GrowthAnalyticsRow[] {
  if (!rows.length) return [];

  return rows.map((current, index) => {
    if (index === 0) {
      return {
        ...current,
        weightGain: null,
        weeklyWeightRate: null,
      };
    }

    const previous = rows[index - 1];

    let weightGain: number | null = null;
    let weeklyWeightRate: number | null = null;

    if (
      current.weight !== null &&
      previous.weight !== null &&
      current.date &&
      previous.date
    ) {
      weightGain = current.weight - previous.weight;

      const daysDiff =
        (current.date.getTime() - previous.date.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        weeklyWeightRate = (weightGain / daysDiff) * 7;
      }
    }

    return {
      ...current,
      weightGain,
      weeklyWeightRate,
    };
  });
}
