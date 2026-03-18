import { headers } from "next/headers";

type DebugPayload = {
  activeReminders: number;
  pendingOccurrences: number;
  overdueOccurrences: number;
  notificationsQueued: number;
  notificationsRetrying: number;
  notificationsFailed: number;
  notificationsPermanentlyFailed: number;
  lastEngineRun: string | null;
};

async function getDebugData(): Promise<DebugPayload | null> {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${protocol}://${host}` : null);
  const secret = process.env.REMINDER_ENGINE_SECRET;

  if (!baseUrl || !secret) return null;

  const res = await fetch(`${baseUrl}/api/internal/engine/debug`, {
    cache: "no-store",
    headers: {
      "x-engine-secret": secret,
    },
  });

  if (!res.ok) return null;
  return (await res.json()) as DebugPayload;
}

export default async function EngineDebugPage() {
  const data = await getDebugData();

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Engine Debug</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Debug data is unavailable. Ensure `REMINDER_ENGINE_SECRET` and app URL are configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Engine Debug</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Card label="Active reminders" value={data.activeReminders} />
        <Card label="Pending occurrences" value={data.pendingOccurrences} />
        <Card label="Overdue occurrences" value={data.overdueOccurrences} />
        <Card label="Queued notifications" value={data.notificationsQueued} />
        <Card label="Retrying notifications" value={data.notificationsRetrying} />
        <Card label="Failed notifications" value={data.notificationsFailed} />
        <Card
          label="Permanently failed"
          value={data.notificationsPermanentlyFailed}
        />
        <Card
          label="Last engine run"
          value={data.lastEngineRun ? new Date(data.lastEngineRun).toLocaleString() : "-"}
        />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold sm:text-xl">{value}</p>
    </div>
  );
}
