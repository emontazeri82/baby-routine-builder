"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, Clock, Layers, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AssistantMessage } from "@/lib/assistant/assistant.types";
import {
  computeDrawerAnalytics,
  formatGapMinutes,
  inferFocusActivityLabels,
  type DrawerActivityInput,
} from "@/lib/assistant/assistantDrawerStats";
import {
  detectDeviation,
  detectTrend,
  detectMissed,
  detectConsistency,
  buildRecommendations,
  type Recommendation,
} from "@/lib/assistant/drawerAnalysis";
export type AssistantActivityLike = DrawerActivityInput;

export type AssistantViewDrawerProps = {
  message: AssistantMessage | null;
  activities?: AssistantActivityLike[];
  onClose: () => void;
};

export default function AssistantViewDrawer({
  message,
  activities = [],
  onClose,
}: AssistantViewDrawerProps) {
  const router = useRouter();
  if (!message) return null;

  const msg = message;
  const focus = inferFocusActivityLabels(msg);
  const analytics = computeDrawerAnalytics(activities, focus);

  const isReview =
    msg.actionType === "review" ||
    msg.actionLabel?.toLowerCase().includes("review");

  const sortedActivities = [...activities]
    .filter((a): a is AssistantActivityLike & { startTime: string | Date } =>
      Boolean(a.startTime)
    )
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  const gaps = sortedActivities
    .slice(0, 6)
    .map((a, i, arr) => {
      if (i === arr.length - 1) return null;

      const current = new Date(a.startTime!).getTime();
      const next = new Date(arr[i + 1].startTime!).getTime();

      return Math.floor((current - next) / 60000);
    })
    .filter((g): g is number => g !== null && g > 0);
  const lastActivity = sortedActivities[0];

  const minutesSinceLast =
    lastActivity?.startTime != null
      ? Math.floor(
        (Date.now() -
          new Date(lastActivity.startTime).getTime()) /
        60000
      )
      : null;
  const deviation = detectDeviation({
    avgGapMinutes: analytics.avgGapMinutes,
    minutesSinceLast,
  });

  const trend = detectTrend({
    gaps,
  });

  const missed = detectMissed({
    avgGapMinutes: analytics.avgGapMinutes,
    minutesSinceLast,
  });

  const consistency = detectConsistency({
    gaps,
  });

  const recommendations = buildRecommendations({
    deviation,
    trend,
    missed,
    consistency,
  });
  function formatAge(minutes: number | null) {
    if (minutes === null || minutes < 0) return "No data";

    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function getPrimaryActionLabel() {
    switch (msg.type) {
      case "time":
        return "Start Activity";
      case "critical":
        return "Fix Now";
      case "pattern":
        return "Log Activity";
      case "guidance":
        return "Take Action";
      default:
        return "Continue";
    }
  }

  function handlePrimaryAction() {
    if (msg.actionPayload?.route) {
      router.push(msg.actionPayload.route);
    }
    onClose();
  }

  function handleReviewNavigation() {
    if (msg.actionPayload?.route) {
      router.push(msg.actionPayload.route);
      onClose();
    }
  }

  const focusTitle =
    analytics.mode === "focus" && analytics.focusLabels.length
      ? analytics.focusLabels.join(" · ")
      : "All activity types";

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 z-[10001] flex h-full w-full max-w-[440px] flex-col border-l bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="min-w-0 pr-2">
              <h2 className="truncate text-lg font-semibold text-neutral-900">
                {msg.title}
              </h2>
              <p className="text-xs text-neutral-500">
                {analytics.mode === "focus"
                  ? `Focused on ${focusTitle}`
                  : "Overview · last 7 days"}
                {typeof msg.confidence === "number"
                  ? ` · confidence ${Math.round(msg.confidence * 100)}%`
                  : null}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 hover:bg-neutral-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {msg.description ? (
              <p className="text-sm leading-relaxed text-neutral-600">
                {msg.description}
              </p>
            ) : null}

            {msg.evidence && msg.evidence.length > 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Why this suggestion
                </p>
                <ul className="space-y-2">
                  {msg.evidence.slice(0, 6).map((ev, i) => (
                    <li key={`${ev.generator}-${i}`} className="text-sm">
                      <span className="font-medium text-neutral-800">
                        {ev.title}
                      </span>
                      {ev.description ? (
                        <span className="text-neutral-600">
                          {" "}
                          — {ev.description}
                        </span>
                      ) : null}
                      {typeof ev.priority === "number" ? (
                        <span className="ml-1 text-xs text-neutral-400">
                          (p{ev.priority})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
              <div className="space-y-3">

                {/* 🔴 Missed (highest priority) */}
                {missed.isValid && missed.isMissed && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-600 uppercase">
                      Alert
                    </p>
                    <p className="text-sm font-medium text-red-800">
                      {missed.message}
                    </p>
                  </div>
                )}

                {/* 🟠 Deviation — always show row; severity styling when valid */}
                <div
                  className={`rounded-xl border p-3 ${
                    deviation.isValid
                      ? deviation.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : deviation.severity === "warning"
                          ? "border-amber-200 bg-amber-50"
                          : "border-emerald-100 bg-emerald-50/60"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <p className="text-xs uppercase text-neutral-500">Deviation</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {deviation.message}
                  </p>
                  {deviation.isValid && deviation.deviationPercent != null ? (
                    <p className="mt-1 text-xs text-neutral-600">
                      {deviation.deviationPercent > 0 ? "+" : ""}
                      {deviation.deviationPercent}% vs usual spacing
                    </p>
                  ) : null}
                </div>

                {/* 📈 Trend + Consistency */}
                <div className="grid grid-cols-2 gap-2">
                  {trend.isValid && (
                    <div className="rounded-lg border p-2">
                      <p className="text-[10px] text-neutral-500">Trend</p>
                      <p className="text-xs font-medium">{trend.message}</p>
                    </div>
                  )}

                  {consistency.isValid && (
                    <div className="rounded-lg border p-2">
                      <p className="text-[10px] text-neutral-500">Consistency</p>
                      <p className="text-xs font-medium">
                        {consistency.score !== null ? `${consistency.score}%` : "—"}
                      </p>
                    </div>
                  )}
                </div>

              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Insight
              </p>
              <p className="mt-1 text-base font-semibold text-indigo-950">
                {msg.title}
              </p>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <Activity className="h-3.5 w-3.5" />
                Analytics ({focusTitle})
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-neutral-500">Logged today</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">
                    {analytics.countToday}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                  <p className="text-xs text-neutral-500">Last 7 days</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">
                    {analytics.countLast7Days}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    <TrendingUp className="h-3 w-3" />
                    Avg spacing
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">
                    {formatGapMinutes(analytics.avgGapMinutes)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    Between logs in window
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    <Clock className="h-3 w-3" />
                    Last in window
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-neutral-900">
                    {analytics.lastEventAt
                      ? analytics.lastEventAt.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {analytics.openSessions.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Running now
                </p>
                <ul className="space-y-2">
                  {analytics.openSessions.map((s) => (
                    <li
                      key={`${s.label}-${s.startedAt.getTime()}`}
                      className="flex justify-between text-sm"
                    >
                      <span className="font-medium text-neutral-900">
                        {s.label}
                      </span>
                      <span className="text-neutral-600">
                        since{" "}
                        {s.startedAt.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <Layers className="h-3.5 w-3.5" />
                {analytics.mode === "focus"
                  ? "Recent context"
                  : "Mix (7 days)"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-500">
                    Latest log (assistant feed)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {lastActivity?.startTime
                      ? new Date(lastActivity.startTime).toLocaleString()
                      : "No data"}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-500">Age (any type)</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatAge(minutesSinceLast)}
                  </p>
                </div>
              </div>
            </div>

            {analytics.breakdown.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Counts in window
                </p>
                <div className="flex flex-wrap gap-2">
                  {analytics.breakdown.map((row) => (
                    <span
                      key={row.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800"
                    >
                      {row.label}
                      <span className="tabular-nums text-neutral-500">
                        ×{row.count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {recommendations.length > 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
                <p className="mb-2 text-sm font-medium text-neutral-900">
                  Recommended actions
                </p>

                <ul className="space-y-1.5 text-sm text-neutral-600">
                  {recommendations.slice(0, 5).map((r: Recommendation) => (
                    <li key={r.id}>• {r.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border-t p-6">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-white hover:bg-indigo-700"
            >
              {getPrimaryActionLabel()}
            </button>

            {isReview && msg.actionPayload?.route ? (
              <button
                type="button"
                onClick={handleReviewNavigation}
                className="w-full text-sm text-neutral-500 hover:text-neutral-800"
              >
                Open linked page →
              </button>
            ) : null}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
