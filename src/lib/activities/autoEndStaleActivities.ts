import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { ACTIVITY_CONFIG } from "@/lib/activityConfig";
import { getActivityCompleteness } from "@/lib/activityCompleteness";
import { runInsightProcessors } from "@/lib/insights";
import { bumpAnalyticsCacheVersion } from "@/lib/cache/analyticsCache";

const MAX_ACTIVITY_DURATION_HOURS = 12;
const MAX_ACTIVITY_DURATION_MINUTES = MAX_ACTIVITY_DURATION_HOURS * 60;

export async function autoEndStaleActivities(params: {
  babyId: string;
  userId?: string;
}) {
  const rows = await db
    .select({
      id: activities.id,
      babyId: activities.babyId,
      startTime: activities.startTime,
      metadata: activities.metadata,
      createdBy: activities.createdBy,
      activityName: activityTypes.name,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(and(eq(activities.babyId, params.babyId), isNull(activities.endTime)));

  const now = new Date();

  const stale = rows.filter((row) => {
    if (params.userId && row.createdBy && row.createdBy !== params.userId) {
      return false;
    }

    const config = ACTIVITY_CONFIG[row.activityName];
    if (!config?.allowEnd) return false;

    const autoEndAt = new Date(
      row.startTime.getTime() + MAX_ACTIVITY_DURATION_HOURS * 60 * 60 * 1000
    );

    return now.getTime() >= autoEndAt.getTime();
  });

  if (!stale.length) return { updated: 0 };

  await Promise.all(
    stale.map((row) => {
      const autoEndAt = new Date(
        row.startTime.getTime() + MAX_ACTIVITY_DURATION_HOURS * 60 * 60 * 1000
      );

      return db
        .update(activities)
        .set({
          endTime: autoEndAt,
          durationMinutes: MAX_ACTIVITY_DURATION_MINUTES,
          dataCompleteness: getActivityCompleteness(
            row.activityName,
            row.metadata,
            autoEndAt
          ),
        })
        .where(eq(activities.id, row.id));
    })
  );

  runInsightProcessors({
    babyId: params.babyId,
    expireStale: true,
  }).catch(console.error);

  void bumpAnalyticsCacheVersion(params.babyId);

  return { updated: stale.length };
}
