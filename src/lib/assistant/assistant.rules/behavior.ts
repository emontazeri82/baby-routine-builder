import { AssistantMessage } from "../assistant.types";
import { ActivityConfig } from "@/lib/assistant/config/activityConfig";

export const generateBehaviorMessages = (state: any): AssistantMessage[] => {
  const messages: AssistantMessage[] = [];
  const createdAt = Date.now();

  if (!state) return messages;

  const {
    consistencyScore,
    shortNapCount,
    loggingDelayScore,
    todayCountByType,
  } = state;

  // =====================================================
  // 🧠 ROUTINE CONSISTENCY
  // =====================================================

  if (typeof consistencyScore === "number") {
    if (consistencyScore > 0.85) {
      messages.push({
        id: "routine-consistency-high",
        title: "Routine is very consistent — great job",
        description: "Patterns are stabilizing and predictions will improve",
        actionLabel: "View Insights",
        actionType: "navigate",
        type: "behavior",
        priority: 55,
        score: 55,
        createdAt,
      });
    } else if (consistencyScore > 0.7) {
      messages.push({
        id: "routine-consistency-medium",
        title: "Routine is becoming more consistent",
        description: "Small improvements will strengthen predictions",
        actionLabel: "View Insights",
        actionType: "navigate",
        type: "behavior",
        priority: 50,
        score: 50,
        createdAt,
      });
    }
  }

  // =====================================================
  // 😴 SLEEP QUALITY (SHORT NAPS)
  // =====================================================

  if (typeof shortNapCount === "number" && shortNapCount > 2) {
    messages.push({
      id: "short-naps-detected",
      title: "Short naps are frequent",
      description: "Adjusting wake windows may improve sleep quality",
      actionLabel: "Improve Routine",
      actionType: "navigate",
      type: "behavior",
      priority: 60,
      score: 60,
      createdAt,
    });
  }

  // =====================================================
  // ⏱ LOGGING BEHAVIOR
  // =====================================================

  if (typeof loggingDelayScore === "number") {
    if (loggingDelayScore > 0.8) {
      messages.push({
        id: "logging-delay-high",
        title: "Logging delay is affecting accuracy",
        description: "Logging activities sooner improves predictions",
        actionLabel: "Learn More",
        actionType: "navigate",
        type: "behavior",
        priority: 50,
        score: 50,
        createdAt,
      });
    } else if (loggingDelayScore > 0.6) {
      messages.push({
        id: "logging-delay-medium",
        title: "Try logging activities earlier",
        description: "This helps the assistant give better suggestions",
        actionLabel: "Learn More",
        actionType: "navigate",
        type: "behavior",
        priority: 45,
        score: 45,
        createdAt,
      });
    }
  }

  // =====================================================
  // 🔥 GENERIC ACTIVITY BALANCE CHECK
  // (New powerful system-wide insight)
  // =====================================================

  if (todayCountByType) {
    Object.entries(ActivityConfig).forEach(([key, config]) => {
      const count = todayCountByType?.[config.label];

      // Example: detect low activity engagement
      if (
        config.category === "play" &&
        typeof count === "number" &&
        count < 1
      ) {
        messages.push({
          id: `${key}-low-activity`,
          title: `Low ${config.label.toLowerCase()} activity today`,
          description: `Adding more ${config.label.toLowerCase()} can support development`,
          actionLabel: config.actionLabel,
          actionType: config.defaultActionType,
          type: "behavior",
          priority: 40,
          score: 40,
          createdAt,
        });
      }
    });
  }

  // =====================================================
  // 🧠 FUTURE HOOK: CONFIG-DRIVEN BEHAVIOR RULES
  // =====================================================

  Object.values(ActivityConfig).forEach((config) => {
    if (!config.enablePatternRules) return;

    if (config.shouldTrigger?.(state)) {
      messages.push({
        id: `${config.key}-behavior-trigger`,
        title: `${config.label} pattern detected`,
        description: "Assistant noticed a behavior trend",
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "behavior",
        priority: config.priority,
        score: config.priority,
        createdAt,
      });
    }
  });

  return messages;
};

export default generateBehaviorMessages;