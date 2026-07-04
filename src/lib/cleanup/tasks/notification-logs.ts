import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notificationLogs } from "@/lib/db/schema";

export async function cleanupNotificationLogs(retentionDays: number) {
  const deleted = await db
    .delete(notificationLogs)
    .where(
      sql`${notificationLogs.sentAt} < now() - (${retentionDays} * interval '1 day')`
    )
    .returning({ id: notificationLogs.id });

  return deleted.length;
}
