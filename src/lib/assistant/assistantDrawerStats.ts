import type { AssistantMessage } from "./assistant.types";
import { ACTIVITY_CONFIG } from "@/lib/activityConfig";

export type DrawerActivityInput = {
  id: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  activityName?: string | null;
};

export type DrawerAnalytics = {
  mode: "focus" | "overview";
  focusLabels: string[];
  countToday: number;
  countLast7Days: number;
  /** Mean minutes between consecutive logs (same filtered set). */
  avgGapMinutes: number | null;
  /** Duration-capable activities still open (no end time). */
  openSessions: { label: string; startedAt: Date }[];
  lastEventAt: Date | null;
  /** Sorted desc by count within the filtered window. */
  breakdown: { label: string; count: number }[];
};

/** Activity names that typically use endTime when running. */
const OPEN_SESSION_LABELS = new Set(["Sleep", "Nap", "Play", "Pumping"]);

/**
 * Guess which logged activity types this message is about so we can filter stats.
 * Returns null → show overview across all types in the window.
 */
export function inferFocusActivityLabels(
  message: AssistantMessage
): string[] | null {
  const raw = message.actionPayload?.activityType;
  if (typeof raw === "string" && raw.trim()) {
    const match = Object.values(ACTIVITY_CONFIG).find(
      (c) => c.name.toLowerCase() === raw.trim().toLowerCase()
    );
    return [match?.name ?? raw.trim()];
  }

  const haystack =
    `${message.title} ${message.description ?? ""} ${message.signal ?? ""} ${message.signalKey ?? ""}`.toLowerCase();

  const hits = new Set<string>();
  for (const c of Object.values(ACTIVITY_CONFIG)) {
    const n = c.name.toLowerCase();
    if (haystack.includes(n)) hits.add(c.name);
  }

  return hits.size ? [...hits] : null;
}

export function computeDrawerAnalytics(
  activities: DrawerActivityInput[],
  focusLabels: string[] | null,
  now = new Date()
): DrawerAnalytics {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  let windowRows = activities.filter((a) => {
    if (!a.startTime) return false;
    return new Date(a.startTime) >= sevenDaysAgo;
  });

  const focusSet =
    focusLabels && focusLabels.length ? new Set(focusLabels) : null;

  if (focusSet) {
    windowRows = windowRows.filter(
      (a) => a.activityName && focusSet.has(a.activityName)
    );
  }

  const countLast7Days = windowRows.length;

  const countToday = windowRows.filter(
    (a) => new Date(a.startTime!) >= dayStart
  ).length;

  let avgGapMinutes: number | null = null;
  if (windowRows.length >= 2) {
    const sorted = [...windowRows].sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    );
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(
        (new Date(sorted[i].startTime!).getTime() -
          new Date(sorted[i - 1].startTime!).getTime()) /
          60000
      );
    }
    if (gaps.length) {
      avgGapMinutes =
        gaps.reduce((acc, g) => acc + g, 0) / gaps.length;
    }
  }

  const openSessions: { label: string; startedAt: Date }[] = [];
  for (const a of activities) {
    if (!a.activityName || !OPEN_SESSION_LABELS.has(a.activityName))
      continue;
    if (!a.startTime || a.endTime) continue;
    openSessions.push({
      label: a.activityName,
      startedAt: new Date(a.startTime),
    });
  }

  let lastEventAt: Date | null = null;
  if (windowRows.length) {
    let best = 0;
    for (const r of windowRows) {
      const t = new Date(r.startTime!).getTime();
      if (t > best) {
        best = t;
        lastEventAt = new Date(r.startTime!);
      }
    }
  }

  const byLabel = new Map<string, number>();
  for (const a of windowRows) {
    const lab = a.activityName ?? "Unknown";
    byLabel.set(lab, (byLabel.get(lab) ?? 0) + 1);
  }

  const breakdown = [...byLabel.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    mode: focusSet ? "focus" : "overview",
    focusLabels: focusLabels ?? [],
    countToday,
    countLast7Days,
    avgGapMinutes,
    openSessions,
    lastEventAt,
    breakdown,
  };
}

export function formatGapMinutes(minutes: number | null): string {
  if (minutes === null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
