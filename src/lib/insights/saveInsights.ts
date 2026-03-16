import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";
import { DashboardInsight } from "../insights/types";
import { sql } from "drizzle-orm";

/* ------------------------------------------------
   Save Insights
------------------------------------------------ */

export async function saveInsights(
  babyId: string,
  activityId: string | null,
  generatedInsights: DashboardInsight[]
) {
  if (!babyId) {
    console.warn("INSIGHT SAVE SKIPPED: missing babyId");
    return;
  }

  if (!generatedInsights || generatedInsights.length === 0) return;

  const validInsights = generatedInsights.filter((insight) => {
    if (!insight) return false;
    if (!insight.id) return false;
    if (!insight.category) return false;
    if (!insight.severity) return false;
    if (!insight.title) return false;
    if (!insight.message) return false;
    return true;
  });

  if (validInsights.length === 0) {
    console.warn("INSIGHT SAVE SKIPPED: no valid insights");
    return;
  }

  try {
    await db
      .insert(insights)
      .values(
        validInsights.map((insight) => ({
          babyId,
          activityId: activityId ?? null,
          insightKey: insight.id,
          category: insight.category,
          severity: insight.severity,
          title: insight.title,
          message: insight.message,
          actionLabel: insight.actionLabel ?? null,
          actionUrl: insight.actionUrl ?? null
        }))
      )
      .onConflictDoUpdate({
        target: [insights.babyId, insights.insightKey],
        set: {
          activityId: sql`excluded.activity_id`,
          category: sql`excluded.category`,
          severity: sql`excluded.severity`,
          title: sql`excluded.title`,
          message: sql`excluded.message`,
          actionLabel: sql`excluded.action_label`,
          actionUrl: sql`excluded.action_url`,
          updatedAt: sql`now()`,
          expiredAt: null,
        },
      });

  } catch (error) {
    console.error("INSIGHT SAVE ERROR:", error);
  }
}
