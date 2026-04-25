import { AssistantMessage } from "../assistant.types";
import { ActivityConfig } from "@/lib/assistant/config/activityConfig";
import { formatDuration } from "../assistant.utils";
export function generateTimeMessages(state: any): AssistantMessage[] {
  const messages: AssistantMessage[] = [];
  const createdAt = Date.now();

  if (!state) return messages;

  const {
    lastByType,
    minutesSinceByType,

    // keep feeding intelligence
    minutesSinceLastFeeding,
    avgFeedingInterval,
    feedingConfidence,
  } = state;

  // =====================================================
  // 🍼 FEEDING (KEEP ADVANCED LOGIC)
  // =====================================================

  if (
    avgFeedingInterval !== null &&
    minutesSinceLastFeeding !== null
  ) {
    const minutes = minutesSinceLastFeeding;
    const expected = avgFeedingInterval;

    if (minutes > expected) {
      let title = "Feeding may be due";
      let description = `Last feeding was ${formatDuration(Math.round(minutes))} ago`;

      if (feedingConfidence === "high") {
        title = "Feeding is overdue";
        description += " (based on weekly pattern)";
      } else if (feedingConfidence === "medium") {
        title = "Feeding likely due";
        description += " (based on recent pattern)";
      }

      messages.push({
        id: "feeding-due",
        title,
        description,
        actionLabel: "Log Feeding",
        actionType: "log",
        type: "time",
        signal: "feeding-urgency",
        signalKey: "feeding-urgency",
        generator: "time",
        mergeStrategy: "summary",
        priority: feedingConfidence === "high" ? 95 : 85,
        score: feedingConfidence === "high" ? 95 : 85,
        createdAt,
      });
    } else if (minutes > expected * 0.8) {
      messages.push({
        id: "feeding-soon",
        title: "Feeding may be needed soon",
        description: `Last feeding was ${formatDuration(Math.round(minutes))} ago`,
        actionLabel: "Prepare Feeding",
        actionType: "start",
        type: "time",
        signal: "feeding-urgency",
        signalKey: "feeding-urgency",
        generator: "time",
        mergeStrategy: "summary",
        priority: 75,
        score: 75,
        createdAt,
      });
    }
  }

  // =====================================================
  // 🔥 GENERIC ACTIVITY ENGINE (ALL 10 ACTIVITIES)
  // =====================================================

  Object.entries(ActivityConfig).forEach(([key, config]) => {
    if (!config.enableTimeRules) return;

    const last = lastByType?.[config.label];
    const minutes = minutesSinceByType?.[config.label];

    if (!last || minutes === null) return;

    const expected =
      config.expectedInterval?.(state) ?? null;

    if (!expected) return;

    // 🛑 Prevent spam / bad UX
    if (config.minInterval && minutes < config.minInterval) {
      return;
    }

    // 🚨 DUE NOW
    if (minutes > expected) {
      messages.push({
        id: `${key}-due`,
        title: `${config.label} may be due`,
        description: `Last ${config.label} was ${formatDuration(Math.round(minutes))} ago`,
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "time",
        signal: `${key}-urgency`,
        signalKey: `${key}-urgency`,
        generator: "time",
        mergeStrategy: "summary",
        priority:
          config.getDynamicPriority?.(state) ?? config.priority,
        score:
          config.getDynamicPriority?.(state) ?? config.priority,
        createdAt,
      });
    }

    // ⚠️ COMING SOON
    else if (
      config.dueSoonRatio &&
      minutes > expected * config.dueSoonRatio
    ) {
      messages.push({
        id: `${key}-soon`,
        title: `${config.label} may be needed soon`,
        description: `Last ${config.label} was ${formatDuration(Math.round(minutes))} ago`,
        actionLabel: config.actionLabel,
        actionType: config.defaultActionType,
        type: "time",
        signal: `${key}-urgency`,
        signalKey: `${key}-urgency`,
        generator: "time",
        mergeStrategy: "summary",
        priority: config.priority - 10,
        score: config.priority - 10,
        createdAt,
      });
    }
  });

  // =====================================================
  // 🔁 REPEAT LAST ACTIVITY (SMART + CONFIG-DRIVEN)
  // =====================================================

  const { lastActivity } = state;

  if (lastActivity?.activityName) {
    const activityName = lastActivity.activityName;

    const configEntry = Object.values(ActivityConfig).find(
      (c) => c.aliases.includes(activityName)
    );

    if (configEntry?.supportsRepeatAction) {
      const startTime = lastActivity.startTime
        ? new Date(lastActivity.startTime).getTime()
        : null;

      const minutesSinceLast =
        startTime && !isNaN(startTime)
          ? Math.floor((Date.now() - startTime) / 60000)
          : null;

      if (
        minutesSinceLast === null ||
        minutesSinceLast > (configEntry.minInterval ?? 10)
      ) {
        messages.push({
          id: `repeat-${configEntry.key}`,
          title: `Log ${configEntry.label} again`,
          description:
            minutesSinceLast !== null
              ? `Last logged ${formatDuration(Math.round(minutesSinceLast))} ago`
              : "Quickly repeat your last activity",
          actionLabel: `Log ${configEntry.label}`,
          actionType: configEntry.defaultActionType,
          type: "time",
          priority: 60,
          score: 60,
          createdAt,
        });
      }
    }
  }

  return messages;
}