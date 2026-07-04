import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { reminderActionLogs } from "@/lib/db/schema";

export async function cleanupReminderActionLogs(retentionDays: number) {
  const deleted = await db
    .delete(reminderActionLogs)
    .where(
      sql`${reminderActionLogs.createdAt} < now() - (${retentionDays} * interval '1 day')`
    )
    .returning({ id: reminderActionLogs.id });

  return deleted.length;
}
