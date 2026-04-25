import { AssistantMessage } from "../assistant.types";
import { ActivityConfig } from "@/lib/assistant/config/activityConfig";

export const generatePredictiveMessages = (state: any): AssistantMessage[] => {
  const messages: AssistantMessage[] = [];
  const createdAt = Date.now();

  if (!state) return messages;

  const {
    minutesSinceLastSleep,
    minutesSinceLastFeeding,
    avgFeedingInterval,
    feedingConfidence,
    awakeMinutes,
    expectedWakeWindow,
    lastByType,
    minutesSinceByType,
  } = state;

  // =====================================================
  // 😴 SLEEP PREDICTION
  // =====================================================

  if (typeof minutesSinceLastSleep === "number") {
    // 📊 Early prediction (before due)
    if (minutesSinceLastSleep > 100 && minutesSinceLastSleep <= 120) {
      messages.push({
        id: "sleep-predict-soon",
        title: "Sleep likely needed soon",
        description: "Based on recent sleep timing patterns",
        actionLabel: "Prepare Sleep",
        actionType: "start",
        type: "predictive",
        signal: "sleep-urgency",
        signalKey: "sleep-urgency",
        generator: "predictive",
        mergeStrategy: "summary",
        priority: 80,
        score: 80,
        createdAt,
      });
    }

    // 🚨 Strong fatigue signal
    if (
      typeof awakeMinutes === "number" &&
      typeof expectedWakeWindow === "number" &&
      awakeMinutes > expectedWakeWindow
    ) {
      messages.push({
        id: "sleep-fatigue",
        title: "Baby may be overtired",
        description: "Awake longer than usual — sleep is likely needed",
        actionLabel: "Start Sleep",
        actionType: "start",
        type: "predictive",
        signal: "sleep-urgency",
        signalKey: "sleep-urgency",
        generator: "predictive",
        mergeStrategy: "summary",
        priority: 95,
        score: 95,
        createdAt,
      });
    }
  }

  // =====================================================
  // 🍼 FEEDING PREDICTION (INTELLIGENT)
  // =====================================================

  if (
    typeof minutesSinceLastFeeding === "number" &&
    typeof avgFeedingInterval === "number"
  ) {
    const ratio = minutesSinceLastFeeding / avgFeedingInterval;

    if (ratio > 0.75 && ratio <= 1) {
      messages.push({
        id: "feeding-predict-soon",
        title: "Feeding likely needed soon",
        description: "Based on recent feeding patterns",
        actionLabel: "Prepare Feeding",
        actionType: "start",
        type: "predictive",
        signal: "feeding-urgency",
        signalKey: "feeding-urgency",
        generator: "predictive",
        mergeStrategy: "summary",
        priority: feedingConfidence === "high" ? 85 : 75,
        score: feedingConfidence === "high" ? 85 : 75,
        createdAt,
      });
    }

    if (ratio > 0.9) {
      messages.push({
        id: "feeding-predict-strong",
        title: "Feeding likely needed very soon",
        description: "Timing aligns closely with recent patterns",
        actionLabel: "Log Feeding",
        actionType: "log",
        type: "predictive",
        signal: "feeding-urgency",
        signalKey: "feeding-urgency",
        generator: "predictive",
        mergeStrategy: "summary",
        priority: 90,
        score: 90,
        createdAt,
      });
    }
  }

  // =====================================================
  // 🔥 GENERIC PREDICTION ENGINE (ALL ACTIVITIES)
  // =====================================================

  Object.entries(ActivityConfig).forEach(([key, config]) => {
    if (!config.enablePredictiveRules) return;

    const last = lastByType?.[config.label];
    const minutes = minutesSinceByType?.[config.label];

    if (!last || typeof minutes !== "number") return;

    const expected = config.expectedInterval?.(state);

    if (!expected) return;

    // 🧠 Prediction window (before due)
    if (minutes > expected * 0.7 && minutes < expected) {
      messages.push({
        id: `${key}-predict-soon`,
        title: `${config.label} may be needed soon`,
        description: "Based on activity rhythm",
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "predictive",
        signal: `${key}-urgency`,
        signalKey: `${key}-urgency`,
        generator: "predictive",
        mergeStrategy: "summary",
        priority: config.priority - 5,
        score: config.priority - 5,
        createdAt,
      });
    }
  });

  // =====================================================
  // 🧠 FUTURE AI HOOK (ADVANCED PREDICTIONS)
  // =====================================================

  Object.values(ActivityConfig).forEach((config) => {
    if (!config.enablePredictiveRules) return;

    if (config.shouldTrigger?.(state)) {
      messages.push({
        id: `${config.key}-predict-ai`,
        title: `${config.label} likely next`,
        description: "Assistant predicts upcoming activity",
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "predictive",
        priority: config.priority,
        score: config.priority,
        createdAt,
      });
    }
  });

  return messages;
};

export default generatePredictiveMessages;