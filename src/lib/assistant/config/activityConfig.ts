// assistant/config/activityConfig.ts

export type ActivityKey =
  | "feeding"
  | "sleep"
  | "nap"
  | "diaper"
  | "play"
  | "bath"
  | "medicine"
  | "temperature"
  | "growth"
  | "pumping";

export type ActivityCategory =
  | "care"
  | "sleep"
  | "health"
  | "play"
  | "growth";

export type ActivityAssistantConfig = {
  key: ActivityKey;

  // 🏷️ Display
  label: string;
  aliases: string[]; // map DB names → canonical key

  // 📊 Classification
  category: ActivityCategory;
  priority: number;

  // ⏱️ Timing Behavior
  expectedInterval?: (state: any) => number | null;
  dueSoonRatio?: number; // % of interval
  maxInterval?: number; // hard limit (alerts)

  // ⚙️ Behavior flags
  requiresEndTime?: boolean;
  isDurationBased?: boolean;
  supportsRepeatAction?: boolean;
  enableTimeRules?: boolean;
  enablePatternRules?: boolean;
  enablePredictiveRules?: boolean;

  // 🚀 Actions
  defaultActionType: "log" | "start" | "view";
  actionLabel: string;

  // 🧠 Intelligence hooks (future-proof)
  getDynamicPriority?: (state: any) => number;
  shouldTrigger?: (state: any) => boolean;

  // 🛑 Safety
  minInterval?: number; // prevent spam suggestions
};

export const ActivityConfig: Record<ActivityKey, ActivityAssistantConfig> = {
  feeding: {
    key: "feeding",
    label: "Feeding",
    aliases: ["Feeding"],

    category: "care",
    priority: 90,

    expectedInterval: (state) => state.avgFeedingInterval ?? 120,
    dueSoonRatio: 0.8,
    maxInterval: 240,

    requiresEndTime: false,
    isDurationBased: false,
    supportsRepeatAction: true,

    enableTimeRules: true,
    enablePatternRules: true,
    enablePredictiveRules: true,

    defaultActionType: "log",
    actionLabel: "Log Feeding",

    minInterval: 60,

    getDynamicPriority: (state) => {
      if (state.feedingConfidence === "high") return 95;
      if (state.feedingConfidence === "medium") return 90;
      return 80;
    },
  },

  sleep: {
    key: "sleep",
    label: "Sleep",
    aliases: ["Sleep"],

    category: "sleep",
    priority: 80,

    expectedInterval: () => 120,
    dueSoonRatio: 0.75,
    maxInterval: 300,

    requiresEndTime: true,
    isDurationBased: true,
    supportsRepeatAction: true,

    enableTimeRules: true,
    enablePatternRules: true,
    enablePredictiveRules: true,

    defaultActionType: "start",
    actionLabel: "Start Sleep",

    minInterval: 90,
  },

  nap: {
    key: "nap",
    label: "Nap",
    aliases: ["Nap"],

    category: "sleep",
    priority: 75,

    expectedInterval: () => 120,
    dueSoonRatio: 0.75,

    requiresEndTime: true,
    isDurationBased: true,
    supportsRepeatAction: true,

    enableTimeRules: true,
    enablePatternRules: true,
    enablePredictiveRules: true,

    defaultActionType: "start",
    actionLabel: "Start Nap",

    minInterval: 90,
  },

  diaper: {
    key: "diaper",
    label: "Diaper",
    aliases: ["Diaper"],

    category: "care",
    priority: 70,

    expectedInterval: () => 90,
    dueSoonRatio: 0.8,

    requiresEndTime: false,
    supportsRepeatAction: true,

    enableTimeRules: true,

    defaultActionType: "log",
    actionLabel: "Log Diaper",

    minInterval: 30,
  },

  play: {
    key: "play",
    label: "Play",
    aliases: ["Play"],

    category: "play",
    priority: 50,

    expectedInterval: () => 180,
    dueSoonRatio: 0.7,

    requiresEndTime: false,
    supportsRepeatAction: false,

    enableTimeRules: true,
    enablePatternRules: true,

    defaultActionType: "start",
    actionLabel: "Start Play",

    minInterval: 120,
  },

  bath: {
    key: "bath",
    label: "Bath",
    aliases: ["Bath"],

    category: "care",
    priority: 45,

    expectedInterval: () => 1440,
    dueSoonRatio: 0.9,

    requiresEndTime: true,
    supportsRepeatAction: false,

    enableTimeRules: true,

    defaultActionType: "start",
    actionLabel: "Start Bath",

    minInterval: 720,
  },

  medicine: {
    key: "medicine",
    label: "Medicine",
    aliases: ["Medicine"],

    category: "health",
    priority: 95,

    expectedInterval: () => 360,

    requiresEndTime: false,
    supportsRepeatAction: true,

    enableTimeRules: true,
    enablePredictiveRules: true,

    defaultActionType: "log",
    actionLabel: "Log Medicine",

    minInterval: 180,
  },

  temperature: {
    key: "temperature",
    label: "Temperature",
    aliases: ["Temperature"],

    category: "health",
    priority: 85,

    expectedInterval: () => 240,

    requiresEndTime: false,
    supportsRepeatAction: true,

    enableTimeRules: true,

    defaultActionType: "log",
    actionLabel: "Log Temperature",

    minInterval: 120,
  },

  growth: {
    key: "growth",
    label: "Growth",
    aliases: ["Growth"],

    category: "growth",
    priority: 40,

    expectedInterval: () => 10080,

    requiresEndTime: false,
    supportsRepeatAction: false,

    enableTimeRules: true,

    defaultActionType: "log",
    actionLabel: "Log Growth",

    minInterval: 10080,
  },

  pumping: {
    key: "pumping",
    label: "Pumping",
    aliases: ["Pumping"],

    category: "care",
    priority: 75,

    expectedInterval: () => 180,

    requiresEndTime: true,
    supportsRepeatAction: true,

    enableTimeRules: true,
    enablePatternRules: true,

    defaultActionType: "start",
    actionLabel: "Start Pumping",

    minInterval: 120,
  },
};

export default ActivityConfig;