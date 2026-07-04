import { and, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { reminderOccurrences } from "@/lib/db/schema";

export async function cleanupReminderOccurrences(retentionDays: number) {
  const deleted = await db
    .delete(reminderOccurrences)
    .where(
      and(
        inArray(reminderOccurrences.status, [
          "completed",
          "skipped",
          "expired",
        ]),
        sql`${reminderOccurrences.createdAt} < now() - (${retentionDays} * interval '1 day')`
      )
    )
    .returning({ id: reminderOccurrences.id });

  return deleted.length;
}
