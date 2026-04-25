import { AssistantMessage } from "../assistant.types";
import { ActivityConfig } from "@/lib/assistant/config/activityConfig";

export const generatePatternMessages = (state: any): AssistantMessage[] => {
  const messages: AssistantMessage[] = [];
  const createdAt = Date.now();

  if (!state) return messages;

  const {
    routines,
    nowMinutes,
    patternDeviationScore,
  } = state;

  if (!Array.isArray(routines) || typeof nowMinutes !== "number") {
    return messages;
  }

  // =====================================================
  // 🔁 ROUTINE MATCH + MISSED EVENTS
  // =====================================================

  // ✅ ADD THESE ABOVE the loop
  const getTimeDiff = (a: number, b: number) => {
    const diff = Math.abs(a - b);
    return Math.min(diff, 1440 - diff);
  };

  const MISSED_WINDOW = 180;

  // ✅ REPLACE OLD LOOP WITH THIS
  routines.forEach((r: any) => {
    if (!r?.type || typeof r.time !== "number") return;

    const config = Object.values(ActivityConfig).find((c) =>
      c.aliases.some(
        (alias) => alias.toLowerCase() === r.type.toLowerCase()
      )
    );

    if (!config || !config.enablePatternRules) return;

    const diff = getTimeDiff(nowMinutes, r.time);

    const timeFormatted =
      r.timeFormatted ??
      `${Math.floor(r.time / 60)}:${(r.time % 60)
        .toString()
        .padStart(2, "0")}`;

    // 🎯 ROUTINE MATCH
    if (diff < 15) {
      messages.push({
        id: `${config.key}-routine-match`,
        title: `${config.label} usually happens around ${timeFormatted}`,
        description: "Based on recent patterns",
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "pattern",
        signal: `${config.key}-rhythm`,
        signalKey: `${config.key}-rhythm`,
        generator: "pattern",
        mergeStrategy: "summary",
        priority:
          config.getDynamicPriority?.(state) ??
          config.priority + 5,
        score:
          config.getDynamicPriority?.(state) ??
          config.priority + 5,
        createdAt,
      });
    }

    // ⚠️ MISSED ROUTINE (FIXED WINDOW)
    if (
      nowMinutes > r.time + 60 &&
      nowMinutes < r.time + MISSED_WINDOW
    ) {
      messages.push({
        id: `${config.key}-missed`,
        title: `${config.label} was expected at ${timeFormatted}`,
        description: "Routine may be off",
        actionLabel: `Log ${config.label}`,
        actionType: "log",
        type: "pattern",
        signal:
          config.key === "sleep" || config.key === "nap"
            ? "sleep-urgency"
            : `${config.key}-urgency`,
        signalKey:
          config.key === "sleep" || config.key === "nap"
            ? "sleep-urgency"
            : `${config.key}-urgency`,
        generator: "pattern",
        mergeStrategy: "summary",
        priority: config.priority + 10,
        score: config.priority + 10,
        createdAt,
      });
    }
  });



  // =====================================================
  // 🧠 PATTERN DEVIATION (GLOBAL INSIGHT)
  // =====================================================

  if (typeof patternDeviationScore === "number") {
    if (patternDeviationScore > 0.75) {
      messages.push({
        id: "pattern-deviation-high",
        title: "Routine is significantly off pattern",
        description:
          "Multiple activities are out of sync with usual schedule",
        actionLabel: "Review Day",
        actionType: "navigate",
        type: "pattern",
        priority: 80,
        score: 80,
        createdAt,
      });
    } else if (patternDeviationScore > 0.6) {
      messages.push({
        id: "pattern-deviation-medium",
        title: "Routine differs from usual pattern",
        description: "Some activities are slightly out of sync",
        actionLabel: "Review Day",
        actionType: "navigate",
        type: "pattern",
        priority: 70,
        score: 70,
        createdAt,
      });
    }
  }

  // =====================================================
  // 🔥 FUTURE-READY CONFIG HOOKS
  // =====================================================

  Object.values(ActivityConfig).forEach((config) => {
    if (!config.enablePatternRules) return;

    if (config.shouldTrigger?.(state)) {
      messages.push({
        id: `${config.key}-pattern-trigger`,
        title: `${config.label} pattern detected`,
        description: "Assistant identified a recurring behavior",
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "pattern",
        priority: config.priority,
        score: config.priority,
        createdAt,
      });
    }
  });

  return messages;
};

export default generatePatternMessages;