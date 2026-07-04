import type { AssistantMessage } from "../assistant.types";
import { formatDuration } from "../assistant.utils";

type PriorityState = {
  minutesSinceLastFeeding?: number | null;
  avgFeedingInterval?: number | null;
  feedingConfidence?: "low" | "medium" | "high";
  awakeMinutes?: number | null;
  expectedWakeWindow?: number;
  minutesSinceByType?: Record<string, number | null>;
  openByType?: Record<string, unknown[]>;
};

type PriorityCandidate = Pick<
  AssistantMessage,
  | "id"
  | "title"
  | "description"
  | "actionLabel"
  | "actionType"
  | "type"
  | "signal"
  | "signalKey"
  | "generator"
  | "mergeStrategy"
  | "priority"
  | "score"
  | "createdAt"
>;

function hasOpenActivity(state: PriorityState, activityName: string) {
  return (state.openByType?.[activityName] ?? []).length > 0;
}

function buildFeedingCandidate(
  state: PriorityState,
  createdAt: number
): PriorityCandidate | null {
  const minutes = state.minutesSinceLastFeeding;
  const expected = state.avgFeedingInterval;

  if (minutes === null || minutes === undefined || !expected) return null;
  if (minutes < expected * 1.15) return null;

  const highConfidence = state.feedingConfidence === "high";
  const priority = highConfidence ? 108 : 98;

  return {
    id: "top-action-feeding",
    title: "Feeding looks like the next priority",
    description: `Last feeding was ${formatDuration(Math.round(minutes))} ago`,
    actionLabel: "Log Feeding",
    actionType: "log",
    type: "time",
    signal: "feeding-urgency",
    signalKey: "feeding-urgency",
    generator: "priority",
    mergeStrategy: "summary",
    priority,
    score: priority,
    createdAt,
  };
}

function buildSleepCandidate(
  state: PriorityState,
  createdAt: number
): PriorityCandidate | null {
  const awakeMinutes = state.awakeMinutes;
  const expectedWakeWindow = state.expectedWakeWindow ?? 120;

  if (awakeMinutes === null || awakeMinutes === undefined) return null;
  if (hasOpenActivity(state, "Sleep") || hasOpenActivity(state, "Nap")) return null;
  if (awakeMinutes < expectedWakeWindow * 1.25) return null;

  const priority = awakeMinutes > expectedWakeWindow * 1.75 ? 105 : 95;

  return {
    id: "top-action-sleep",
    title: "Sleep may be the next priority",
    description: `Awake for ${formatDuration(Math.round(awakeMinutes))}`,
    actionLabel: "Start Sleep",
    actionType: "start",
    type: "predictive",
    signal: "sleep-urgency",
    signalKey: "sleep-urgency",
    generator: "priority",
    mergeStrategy: "summary",
    priority,
    score: priority,
    createdAt,
  };
}

function buildDiaperCandidate(
  state: PriorityState,
  createdAt: number
): PriorityCandidate | null {
  const minutes = state.minutesSinceByType?.Diaper;

  if (minutes === null || minutes === undefined) return null;
  if (minutes < 150) return null;

  return {
    id: "top-action-diaper",
    title: "Diaper check may be next",
    description: `Last diaper was ${formatDuration(Math.round(minutes))} ago`,
    actionLabel: "Log Diaper",
    actionType: "log",
    type: "time",
    signal: "diaper-urgency",
    signalKey: "diaper-urgency",
    generator: "priority",
    mergeStrategy: "summary",
    priority: 88,
    score: 88,
    createdAt,
  };
}

export const generatePriorityMessage = (
  state: PriorityState
): PriorityCandidate[] => {
  const createdAt = Date.now();
  const candidates = [
    buildFeedingCandidate(state, createdAt),
    buildSleepCandidate(state, createdAt),
    buildDiaperCandidate(state, createdAt),
  ].filter((candidate): candidate is PriorityCandidate => Boolean(candidate));

  if (!candidates.length) return [];

  return [
    candidates.sort((a, b) => {
      const scoreDiff = b.priority + b.score - (a.priority + a.score);
      if (scoreDiff !== 0) return scoreDiff;
      return a.id.localeCompare(b.id);
    })[0],
  ];
};

export default generatePriorityMessage;