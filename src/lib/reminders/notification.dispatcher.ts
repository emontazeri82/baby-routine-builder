import { db } from "@/lib/db";
import { and, eq, lte, isNull } from "drizzle-orm";

import { reminderOccurrences } from "@/lib/db/schema";
import { markOccurrenceAsDue } from "./notification.engine";

export async function dispatchNotifications(params: {
  babyId?: string;
}) {
  const now = new Date();

  // 1. Find due + not triggered
  const dueOccurrences = await db
    .select()
    .from(reminderOccurrences)
    .where(
      and(
        eq(reminderOccurrences.status, "pending"),
        lte(reminderOccurrences.scheduledFor, now),
        isNull(reminderOccurrences.triggeredAt)
      )
    )
    .limit(50); // prevent overload

  let processedCount = 0;
  let skippedCount = 0;

  for (const occ of dueOccurrences) {
    try {
      const result = await markOccurrenceAsDue({
        occurrenceId: occ.id,
        reminderId: occ.reminderId,
        userId: null, // you can improve later
      });

      if (result) {
        processedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.error("❌ Dispatch error", occ.id, err);
      skippedCount++;
    }
  }

  return {
    processedCount,
    skippedCount,
  };
}