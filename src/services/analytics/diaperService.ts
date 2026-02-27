import { db } from "@/lib/db";
import {
  activities,
  activityTypes,
  babies,
} from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { subDays } from "date-fns";
import { generateDiaperAnalytics } from "@/lib/utils/analytics/diaper";

/* =========================
   TYPES
========================= */

interface DiaperSummaryResult {
  summary: any;
  daily: any[];
  alerts: any[];
}

/* =========================
   SERVICE
========================= */

export async function getDiaperSummary(
  babyId: string,
  days: number
): Promise<DiaperSummaryResult | null> {
  if (!babyId || !days || days <= 0) {
    return null;
  }

  try {
    /* ---------------- Get Baby Timezone ---------------- */

    const baby = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);

    if (!baby.length) {
      return null;
    }

    const timezone =
      baby[0].timezone || "UTC";

    /* ---------------- Get Diaper Activity Type ---------------- */

    const diaperType = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.name, "Diaper"))
      .limit(1)
      .then((res) => res[0]);

    if (!diaperType) {
      console.warn(
        "[DIAPER SERVICE] Diaper activity type not found"
      );
      return null;
    }

    /* ---------------- Date Filter ---------------- */

    const since = subDays(new Date(), days);

    /* ---------------- Fetch Activities ---------------- */

    const diaperActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activities.activityTypeId, diaperType.id),
          gte(activities.startTime, since)
        )
      );

    /* ---------------- No Data Case ---------------- */

    if (!diaperActivities.length) {
      return {
        summary: null,
        daily: [],
        alerts: [],
      };
    }

    /* ---------------- Generate Analytics ---------------- */

    const analytics = generateDiaperAnalytics(
      diaperActivities,
      timezone
    );

    return analytics;
  } catch (error) {
    console.error(
      "[DIAPER SERVICE ERROR]",
      error
    );
    return null;
  }
}
