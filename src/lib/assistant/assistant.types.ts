// assistant.types.ts

// =====================================================
// 🧠 MESSAGE TYPES
// =====================================================

export type AssistantMessageType =
  | "critical"
  | "time"
  | "pattern"
  | "behavior"
  | "predictive"
  | "guidance";

// =====================================================
// ⚙️ ACTION TYPES
// =====================================================

export type AssistantActionType =
  | "log"
  | "start"
  | "end"
  | "navigate"
  | "view"
  | "none"
  | "review";


// =====================================================
// 📦 ACTION PAYLOAD (SINGLE SOURCE OF TRUTH)
// =====================================================

export type AssistantActionPayload = {
  entityId?: string;        // for ending activity
  activityType?: string;    // for starting activity
  babyId?: string;          // required for API actions
  route?: string;           // navigation target
  metadata?: Record<string, any>;
};

// =====================================================
// 🧠 SIGNAL + EVIDENCE
// =====================================================

export type AssistantSignal = string;

export type AssistantEvidence = {
  generator: string;
  title: string;
  description?: string;
  score?: number;
  priority?: number;
};

// =====================================================
// 🎨 UI HINTS (VERY IMPORTANT FOR UX)
// =====================================================

export type AssistantUI = {
  variant?: "primary" | "secondary" | "ghost";
  color?: "red" | "yellow" | "blue" | "green";
  icon?: string;
};

// =====================================================
// 🧾 MAIN MESSAGE TYPE
// =====================================================

export type AssistantMessage = {
  // 🔑 Identity
  id: string;

  // 🧾 Content
  title: string;
  description?: string;

  // 🎯 Action
  actionLabel: string;
  actionType: AssistantActionType;
  actionPayload?: AssistantActionPayload;

  // 🧠 Classification
  type: AssistantMessageType;

  // Optional grouping (future-proof)
  category?: "sleep" | "feeding" | "health" | "activity" | "system";

  signal?: AssistantSignal;
  signalKey?: string;
  generator?: string;

  // 🧾 Evidence (for "why this message")
  evidence?: AssistantEvidence[];
  mergeStrategy?: "dominant" | "summary";

  // 📊 Ranking
  priority: number;
  score: number;
  confidence?: number;

  // 🎨 UI (controls buttons + colors)
  ui?: AssistantUI;

  // 🔗 Optional entity linkage
  entityId?: string;

  // ⏳ Lifecycle
  createdAt: number;
  validUntil?: number;
  cooldownMs?: number;

  // 🧠 Debug / tracing
  source?: "time" | "behavior" | "pattern" | "predictive" | "system";
  debug?: {
    rule?: string;
    context?: Record<string, any>;
  };
};