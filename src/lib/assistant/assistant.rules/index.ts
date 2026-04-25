import type { AssistantMessage } from "../assistant.types";
import type { ActivityLike, AssistantDerivedState } from "../buildDerivedState";
import type {
  Activity as InsightActivity,
  ActivityType,
} from "@/lib/insights/activity.types";
import ActivityConfig from "../config/activityConfig";

/* ---------------- RULE IMPORTS ---------------- */

import { generateCriticalMessages } from "./critical";
import { generateTimeMessages } from "./time";
import { generatePatternMessages } from "./pattern";
import { generateBehaviorMessages } from "./behavior";
import { generateGuidanceMessages } from "./guidance";
import { generatePredictiveMessages } from "./predictive";
import { generateAnomalyMessages } from "./anomaly";
import { generateContextMessages } from "./context";
import { generateMultiSignalMessages } from "./multisignal";
import { generateSystemMessages } from "./system";
import { generateLearningMessages } from "./learning";
import { generatePriorityMessage } from "./priority";
import { generateMicroMessages } from "./micro";

/* ---------------- PIPELINE IMPORTS ---------------- */

import { normalizeMessages } from "./normalizeMessages";
import { aggregateSignals } from "./aggregateSignals";
import { dedupeMessages } from "./dedupeMessages";
import { applyCooldown } from "./cooldownFilter";
import { selectBestMessages } from "./selector";

import { runInsightProcessors } from "../processors/runInsightProcessors";
import convertInsightsToMessages from "../adapters/insightAdapter";
/* ---------------- SAFE EXECUTOR ---------------- */

type AssistantRuleState = AssistantDerivedState & {
  lastShownMap?: Record<string, number>;
  babyId?: string;
};

const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  Feeding: "feeding",
  Sleep: "sleep",
  Growth: "growth",
  Diaper: "diaper",
  Play: "play",
  Bath: "bath",
  Medicine: "medicine",
  Temperature: "temperature",
  Nap: "nap",
  Pumping: "pumping",
};

/** Map layout/API activity rows into insight `Activity` with value + metadata for processors. */
function mapActivityLikeToInsightActivity(
  activity: ActivityLike,
  activityType: ActivityType,
  babyId?: string
): InsightActivity | null {
  if (!activity.startTime) return null;

  const raw = activity.metadata;
  const meta =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined;

  let value: number | undefined;

  if (
    activityType === "temperature" &&
    meta &&
    typeof meta.value === "number"
  ) {
    let celsius = meta.value;
    if (meta.unit === "F") {
      celsius = ((celsius - 32) * 5) / 9;
    }
    value = celsius;
  } else if (activityType === "growth" && meta) {
    if (typeof meta.weight === "number") value = meta.weight;
    else if (typeof meta.height === "number") value = meta.height;
  } else if (
    activityType === "pumping" &&
    meta &&
    typeof meta.amountMl === "number"
  ) {
    value = meta.amountMl;
  }

  const row: InsightActivity = {
    id: activity.id,
    activityType,
    startTime: activity.startTime,
    endTime: activity.endTime ?? undefined,
    babyId,
    ...(value !== undefined ? { value } : {}),
    ...(meta ? { metadata: meta as InsightActivity["metadata"] } : {}),
  };

  return row;
}

function safeRun(
  generator: (state: AssistantRuleState) => unknown,
  state: AssistantRuleState,
  label: string
): Partial<AssistantMessage>[] {
  try {
    const result = generator(state);

    if (!Array.isArray(result)) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[AssistantRules] ${label} returned non-array`, result);
      }
      return [];
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[AssistantRules] ${label} messages:`, result);
    }

    return result as Partial<AssistantMessage>[];
  } catch (err) {
    console.warn(`[AssistantRules] ${label} failed`, err);
    return [];
  }
}

function inferActivityType(message: AssistantMessage): string | undefined {
  if (message.actionPayload?.activityType) {
    return message.actionPayload.activityType;
  }

  const signal = message.signalKey ?? message.signal ?? "";
  const signalBase = signal.replace(/-(urgency|rhythm)$/, "");
  const signalConfig =
    ActivityConfig[signalBase as keyof typeof ActivityConfig];
  if (signalConfig) {
    return signalConfig.label;
  }

  const idBase = message.id.split("-")[0];
  const idConfig = ActivityConfig[idBase as keyof typeof ActivityConfig];
  if (idConfig) {
    return idConfig.label;
  }

  const content = `${message.title} ${message.description ?? ""}`.toLowerCase();
  for (const config of Object.values(ActivityConfig)) {
    if (
      content.includes(config.label.toLowerCase()) ||
      config.aliases.some((alias) => content.includes(alias.toLowerCase()))
    ) {
      return config.label;
    }
  }

  return undefined;
}

function enrichActionPayloads(
  messages: AssistantMessage[],
  state: AssistantRuleState
) {
  return messages.map((message) => {
    const nextPayload = { ...(message.actionPayload ?? {}) };
    const inferredActivityType = inferActivityType(message);

    if (!nextPayload.babyId && state.babyId) {
      nextPayload.babyId = state.babyId;
    }

    if (!nextPayload.entityId && message.entityId) {
      nextPayload.entityId = message.entityId;
    }

    if (
      (message.actionType === "start" || message.actionType === "log") &&
      !nextPayload.activityType &&
      inferredActivityType
    ) {
      nextPayload.activityType = inferredActivityType;
    }

    if (
      (message.actionType === "navigate" ||
        message.actionType === "view" ||
        message.actionType === "review" ||
        (message.actionType === "log" && !nextPayload.activityType)) &&
      !nextPayload.route &&
      state.babyId
    ) {
      nextPayload.route = `/dashboard/${state.babyId}/activities`;
    }

    if (
      typeof nextPayload.route === "string" &&
      nextPayload.route.startsWith("#") &&
      state.babyId
    ) {
      nextPayload.route = `/dashboard/${state.babyId}/activities${nextPayload.route}`;
    }

    return {
      ...message,
      actionPayload:
        Object.keys(nextPayload).length > 0 ? nextPayload : undefined,
    };
  });
}

function filterUnavailableActions(
  messages: AssistantMessage[],
  state: AssistantRuleState
) {
  return messages.filter((message) => {
    if (message.actionType !== "start") {
      return true;
    }

    const activityType =
      message.actionPayload?.activityType ?? inferActivityType(message);

    if (!activityType) {
      return true;
    }

    const openMatches = state.openByType?.[activityType] ?? [];
    if (openMatches.length > 0) {
      return false;
    }

    return true;
  });
}

/* ---------------- MAIN ENGINE ---------------- */

export async function generateAssistantRules(
  state: AssistantRuleState
): Promise<AssistantMessage[]> {
  const rawMessages: Partial<AssistantMessage>[] = [
    ...safeRun(generateCriticalMessages, state, "critical"),
    ...safeRun(generateSystemMessages, state, "system"),
    ...safeRun(generateTimeMessages, state, "time"),
    ...safeRun(generatePredictiveMessages, state, "predictive"),
    ...safeRun(generatePatternMessages, state, "pattern"),
    ...safeRun(generateAnomalyMessages, state, "anomaly"),
    ...safeRun(generateMultiSignalMessages, state, "multisignal"),
    ...safeRun(generateContextMessages, state, "context"),
    ...safeRun(generateBehaviorMessages, state, "behavior"),
    ...safeRun(generateLearningMessages, state, "learning"),
    ...safeRun(generateGuidanceMessages, state, "guidance"),
    ...safeRun(generateMicroMessages, state, "micro"),

    // ⚠️ Priority rule LAST (can override others)
    ...safeRun(generatePriorityMessage, state, "priority"),
  ];
  /* ---------------- INSIGHT ENGINE ---------------- */

  let insightMessages: AssistantMessage[] = [];
  const { activities, now, babyId } = extractInsightInputs(state);
  try {
    const insights = await runInsightProcessors(
      activities,
      now,
      babyId
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[AssistantRules] Insights:", insights);
    }

    insightMessages = convertInsightsToMessages(insights);
  } catch (err) {
    console.warn("[AssistantRules] Insights failed", err);
  }
  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Raw messages:", rawMessages);
  }

  const allMessages = [
    ...rawMessages,
    ...insightMessages,
  ];

  const normalized = normalizeMessages(allMessages);

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Normalized:", normalized);
  }

  const hydrated = enrichActionPayloads(normalized, state);

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Hydrated actions:", hydrated);
  }

  const available = filterUnavailableActions(hydrated, state);

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Available actions:", available);
  }

  const consolidated = aggregateSignals(available);

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Consolidated:", consolidated);
  }

  const deduped = dedupeMessages(consolidated);

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Deduped:", deduped);
  }
  let filtered = applyGlobalMessagePolicy(deduped);
  // 🔥 FIXED COOLDOWN INTEGRATION
  const lastShownMap = state.lastShownMap ?? {};

  let cooled = applyCooldown(filtered, lastShownMap, {
    updateMap: true, // ✅ CRITICAL FIX
  });

  // If we kept only critical/high-priority rows but every remaining row is still
  // on cooldown (common for insight rows with cooldownMs), the bar would show
  // nothing. Fall back to the full pre-policy pool so guidance and other rows
  // can still surface.
  if (!cooled.length && deduped.length) {
    cooled = applyCooldown(deduped, lastShownMap, {
      updateMap: true,
    });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] After cooldown:", cooled);
  }

  let selected = selectBestMessages(cooled);

  if (!selected.length) {
    if (process.env.NODE_ENV === "development") {
      console.log("[AssistantRules] Pipeline empty — applying fallback message");
    }

    const fallback = enrichActionPayloads(
      normalizeMessages(buildFallbackAssistantMessages(state)),
      state
    );
    selected = selectBestMessages(fallback);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[AssistantRules] Final selected:", selected);
  }

  return selected;
}
function extractInsightInputs(state: AssistantRuleState) {
  return {
    activities: state.activities
      .map((activity): InsightActivity | null => {
        const activityType = activity.activityName
          ? ACTIVITY_TYPE_MAP[activity.activityName]
          : undefined;

        if (!activityType || !activity.startTime) {
          return null;
        }

        return mapActivityLikeToInsightActivity(
          activity,
          activityType,
          state.babyId
        );
      })
      .filter((activity): activity is InsightActivity => Boolean(activity)),
    now: state.now,
    babyId: state.babyId,
  };
};
function applyGlobalMessagePolicy(messages: AssistantMessage[]) {
  const hasCritical = messages.some(m => m.type === "critical");

  if (!hasCritical) return messages;

  return messages.filter(m =>
    m.type === "critical" || m.priority >= 80
  );
}

/** When rules, cooldown, expiry, or the selector yield nothing, show one actionable row. */
function buildFallbackAssistantMessages(
  state: AssistantRuleState
): Partial<AssistantMessage>[] {
  const createdAt = Date.now();
  const activityCount = state.activities?.length ?? 0;
  const hasLoggedToday =
    Array.isArray(state.todayActivities) && state.todayActivities.length > 0;

  if (activityCount === 0) {
    return [
      {
        id: "assistant-fallback-empty",
        title: "Start with one quick log",
        description:
          "Add a feeding, sleep session, or diaper change — personalized tips appear after a few entries.",
        actionLabel: "Log activity",
        actionType: "navigate",
        type: "guidance",
        priority: 12,
        score: 12,
        createdAt,
        generator: "fallback-empty",
      },
    ];
  }

  if (!hasLoggedToday) {
    return [
      {
        id: "assistant-fallback-quiet-day",
        title: "Nothing logged yet today",
        description:
          "Log feedings, sleep, and diapers as they happen — the assistant prioritizes from recent activity.",
        actionLabel: "Go to activities",
        actionType: "navigate",
        type: "guidance",
        priority: 11,
        score: 11,
        createdAt,
        generator: "fallback-quiet-day",
      },
    ];
  }

  return [
    {
      id: "assistant-fallback-caught-up",
      title: "You're caught up",
      description:
        "Suggestions refresh as you log. Open analytics anytime for trends.",
      actionLabel: "View insights",
      actionType: "navigate",
      actionPayload: state.babyId
        ? {
            babyId: state.babyId,
            route: `/dashboard/${state.babyId}/analytics`,
          }
        : undefined,
      type: "guidance",
      priority: 10,
      score: 10,
      createdAt,
      generator: "fallback-caught-up",
    },
  ];
}