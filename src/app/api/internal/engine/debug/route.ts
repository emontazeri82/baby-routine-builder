import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  notificationLogs,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";

function isAuthorized(req: Request) {
  const secret = process.env.REMINDER_ENGINE_SECRET;
  const header = req.headers.get("x-engine-secret");
  return Boolean(secret) && Boolean(header) && header === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [activeReminders] = await db
    .select({ count: count() })
    .from(reminders)
    .where(eq(reminders.status, "active"));

  const [pendingOccurrences] = await db
    .select({ count: count() })
    .from(reminderOccurrences)
    .where(
      and(
        eq(reminderOccurrences.status, "pending"),
        gte(reminderOccurrences.scheduledFor, windowStart),
        lte(reminderOccurrences.scheduledFor, windowEnd)
      )
    );

  const [overdueOccurrences] = await db
    .select({ count: count() })
    .from(reminderOccurrences)
    .innerJoin(reminders, eq(reminderOccurrences.reminderId, reminders.id))
    .where(
      and(
        eq(reminders.status, "active"),
        eq(reminderOccurrences.status, "pending"),
        gte(reminderOccurrences.scheduledFor, windowStart),
        lte(reminderOccurrences.scheduledFor, now)
      )
    );

  const [queued] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, "queued"));
  const [retrying] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, "retrying"));
  const [failed] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, "failed"));
  const [permanent] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, "permanently_failed"));

  const lastEngineRun = await db
    .select({ sentAt: notificationLogs.sentAt })
    .from(notificationLogs)
    .orderBy(desc(notificationLogs.sentAt))
    .limit(1)
    .then((rows) => rows[0]?.sentAt ?? null);

  return NextResponse.json({
    activeReminders: Number(activeReminders?.count ?? 0),
    pendingOccurrences: Number(pendingOccurrences?.count ?? 0),
    overdueOccurrences: Number(overdueOccurrences?.count ?? 0),
    notificationsQueued: Number(queued?.count ?? 0),
    notificationsRetrying: Number(retrying?.count ?? 0),
    notificationsFailed: Number(failed?.count ?? 0),
    notificationsPermanentlyFailed: Number(permanent?.count ?? 0),
    lastEngineRun: lastEngineRun ?? null,
  });
}
