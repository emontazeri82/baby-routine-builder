type RuleCondition = {
  metric: string;
  operator: "<" | ">" | "=" | "<=" | ">=" | "!=";
  value: number;
};

type RuleAction = {
  type: "create_reminder" | "send_notification" | "log_event";
  delayMinutes?: number;
  message?: string;
};

type AutomationRule = {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

export const automationRules: AutomationRule[] = [

  /* =============================
     SLEEP RULES
  ============================== */

  {
    id: "sleep-short-nap",
    name: "Short Nap Recovery",

    conditions: [
      { metric: "sleep_duration", operator: "<", value: 30 }
    ],

    actions: [
      {
        type: "create_reminder",
        delayMinutes: 60
      }
    ]
  },

  {
    id: "sleep-debt-warning",
    name: "Sleep Debt Detected",

    conditions: [
      { metric: "sleep_duration", operator: "<", value: 360 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Baby may be experiencing sleep debt."
      }
    ]
  },

  /* =============================
     NAP RULES
  ============================== */

  {
    id: "nap-low-count",

    name: "Low Nap Count",

    conditions: [
      { metric: "nap_count", operator: "<", value: 2 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Baby may benefit from an additional nap."
      }
    ]
  },

  /* =============================
     FEEDING RULES
  ============================== */

  {
    id: "feeding-interval",

    name: "Feeding Interval Reminder",

    conditions: [
      { metric: "feeding_interval", operator: ">", value: 180 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Baby may be ready for the next feeding."
      }
    ]
  },

  /* =============================
     DIAPER / HYDRATION RULES
  ============================== */

  {
    id: "low-diaper-frequency",

    name: "Low Wet Diaper Count",

    conditions: [
      { metric: "diaper_frequency", operator: "<", value: 3 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Wet diaper frequency appears low today."
      }
    ]
  },

  /* =============================
     PLAY RULES
  ============================== */

  {
    id: "low-play-activity",

    name: "Low Play Activity",

    conditions: [
      { metric: "play_minutes", operator: "<", value: 10 }
    ],

    actions: [
      {
        type: "log_event"
      }
    ]
  },

  /* =============================
     BATH RULES
  ============================== */

  {
    id: "bath-overdue",

    name: "Bath Reminder",

    conditions: [
      { metric: "bath_days_since", operator: ">", value: 3 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Baby may be due for a bath."
      }
    ]
  },

  /* =============================
     MEDICINE RULES
  ============================== */

  {
    id: "missed-medicine-dose",

    name: "Missed Medicine Dose",

    conditions: [
      { metric: "medicine_missed", operator: ">", value: 0 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Some medicine doses may have been missed."
      }
    ]
  },

  /* =============================
     TEMPERATURE RULES
  ============================== */

  {
    id: "temperature-fever-alert",

    name: "Fever Alert",

    conditions: [
      { metric: "temperature", operator: ">", value: 38 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Baby temperature is elevated."
      }
    ]
  },

  {
    id: "temperature-watch",

    name: "Temperature Slightly Elevated",

    conditions: [
      { metric: "temperature", operator: ">", value: 37.5 }
    ],

    actions: [
      {
        type: "log_event"
      }
    ]
  },

  /* =============================
     PUMPING RULES
  ============================== */

  {
    id: "low-pumping-output",

    name: "Low Pumping Output",

    conditions: [
      { metric: "pumping_output", operator: "<", value: 30 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Average pumping output appears low."
      }
    ]
  },

  /* =============================
     GROWTH RULES
  ============================== */

  {
    id: "slow-growth-warning",

    name: "Slow Growth Trend",

    conditions: [
      { metric: "growth_weight_gain", operator: "<", value: 0.1 }
    ],

    actions: [
      {
        type: "send_notification",
        message: "Weight gain appears slower than expected."
      }
    ]
  }

];