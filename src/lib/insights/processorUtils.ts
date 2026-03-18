import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";

export function getDateRange(days: number, endDate = new Date()) {
  const end = new Date(endDate);
  const start = new Date(endDate);
  start.setDate(end.getDate() - (days - 1));
  return { startDate: start, endDate: end };
}

export function dateKeyUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function hoursBetween(a: Date, b: Date) {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[]) {
  if (!values.length) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export async function getActivityTypeIdBySlug(slug: string) {
  const type = await db
    .select({ id: activityTypes.id })
    .from(activityTypes)
    .where(eq(activityTypes.slug, slug))
    .limit(1);

  return type[0]?.id ?? null;
}

export async function fetchActivitiesBySlug(params: {
  babyId: string;
  slug: string;
  startDate: Date;
  endDate: Date;
}) {
  const { babyId, slug, startDate, endDate } = params;
  const typeId = await getActivityTypeIdBySlug(slug);
  if (!typeId) return [];

  return db
    .select({
      id: activities.id,
      startTime: activities.startTime,
      endTime: activities.endTime,
      durationMinutes: activities.durationMinutes,
      metadata: activities.metadata,
      dataCompleteness: activities.dataCompleteness,
    })
    .from(activities)
    .where(
      and(
        eq(activities.babyId, babyId),
        eq(activities.activityTypeId, typeId),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      )
    )
    .orderBy(asc(activities.startTime));
}
