import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  babies,
  reminderActionLogs,
  reminderOccurrences,
  reminders,
} from "@/lib/db/schema";

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function scheduleLabel(reminder: typeof reminders.$inferSelect) {
  if (reminder.scheduleType === "one-time") {
    return `One-time at ${reminder.remindAt.toLocaleString()}`;
  }
  if (reminder.scheduleType === "interval") {
    return reminder.repeatIntervalMinutes
      ? `Every ${reminder.repeatIntervalMinutes} minutes`
      : "Interval schedule";
  }
  return "Recurring schedule";
}

export default async function ReminderDetailPage({
  params,
}: {
  params: Promise<{ babyId: string; reminderId: string }>;
}) {
  const { babyId, reminderId } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const baby = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!baby.length) redirect("/dashboard/babies");

  const reminder = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, reminderId), eq(reminders.babyId, babyId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!reminder) redirect(`/dashboard/${babyId}/reminders`);

  const now = new Date();

  const [upcoming, overdue, past, history] = await Promise.all([
    db
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, reminderId),
          eq(reminderOccurrences.status, "pending"),
          gte(reminderOccurrences.scheduledFor, now)
        )
      )
      .orderBy(reminderOccurrences.scheduledFor),
    db
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, reminderId),
          eq(reminderOccurrences.status, "pending"),
          lte(reminderOccurrences.scheduledFor, now)
        )
      )
      .orderBy(reminderOccurrences.scheduledFor),
    db
      .select()
      .from(reminderOccurrences)
      .where(
        and(
          eq(reminderOccurrences.reminderId, reminderId),
          eq(reminderOccurrences.status, "completed")
        )
      )
      .orderBy(desc(reminderOccurrences.scheduledFor)),
    db
      .select()
      .from(reminderActionLogs)
      .where(eq(reminderActionLogs.reminderId, reminderId))
      .orderBy(desc(reminderActionLogs.createdAt)),
  ]);

  const skipped = await db
    .select()
    .from(reminderOccurrences)
    .where(
      and(
        eq(reminderOccurrences.reminderId, reminderId),
        eq(reminderOccurrences.status, "skipped")
      )
    )
    .orderBy(desc(reminderOccurrences.scheduledFor));

  const expired = await db
    .select()
    .from(reminderOccurrences)
    .where(
      and(
        eq(reminderOccurrences.reminderId, reminderId),
        eq(reminderOccurrences.status, "expired")
      )
    )
    .orderBy(desc(reminderOccurrences.scheduledFor));

  return (
    <div className="space-y-8 p-8">
      <section className="rounded-lg border p-4">
        <h1 className="text-2xl font-semibold">{reminder.title ?? "Reminder"}</h1>
        <p className="text-sm text-neutral-600">{scheduleLabel(reminder)}</p>
        <p className="text-sm">Status: {reminder.status}</p>
        <p className="text-sm">Priority: {reminder.priority ?? 1}</p>
        <p className="text-sm">
          Snooze: {reminder.allowSnooze ? `Allowed (${reminder.maxSnoozes ?? "unlimited"})` : "Disabled"}
        </p>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold">Upcoming Occurrences</h2>
        <ul className="space-y-1 text-sm">
          {upcoming.length === 0 && <li>No upcoming pending occurrences.</li>}
          {upcoming.map((o) => (
            <li key={o.id}>{o.scheduledFor.toLocaleString()} (pending)</li>
          ))}
        </ul>
        <h3 className="mt-4 font-medium">Overdue</h3>
        <ul className="space-y-1 text-sm">
          {overdue.length === 0 && <li>No overdue occurrences.</li>}
          {overdue.map((o) => (
            <li key={o.id}>{o.scheduledFor.toLocaleString()} (overdue)</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold">Past Occurrences</h2>
        <p className="text-sm font-medium">Completed</p>
        <ul className="space-y-1 text-sm">
          {past.length === 0 && <li>No completed occurrences.</li>}
          {past.map((o) => (
            <li key={o.id}>{o.scheduledFor.toLocaleString()}</li>
          ))}
        </ul>

        <p className="mt-4 text-sm font-medium">Skipped</p>
        <ul className="space-y-1 text-sm">
          {skipped.length === 0 && <li>No skipped occurrences.</li>}
          {skipped.map((o) => (
            <li key={o.id}>{o.scheduledFor.toLocaleString()}</li>
          ))}
        </ul>

        <p className="mt-4 text-sm font-medium">Expired</p>
        <ul className="space-y-1 text-sm">
          {expired.length === 0 && <li>No expired occurrences.</li>}
          {expired.map((o) => (
            <li key={o.id}>{o.scheduledFor.toLocaleString()}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold">Action History</h2>
        <div className="space-y-3">
          {history.length === 0 && <p className="text-sm">No history yet.</p>}
          {history.map((entry) => (
            <div key={entry.id} className="rounded border p-3">
              <p className="text-sm font-medium">{entry.actionType}</p>
              <p className="text-xs text-neutral-500">{entry.createdAt.toLocaleString()}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <pre className="overflow-auto rounded bg-neutral-50 p-2 text-xs">
                  {formatJson(entry.previousValue)}
                </pre>
                <pre className="overflow-auto rounded bg-neutral-50 p-2 text-xs">
                  {formatJson(entry.newValue)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
