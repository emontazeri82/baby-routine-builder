import type { AssistantMessage } from "../assistant.types";

// =====================================================
// ✅ VALID ENUMS (FIXED)
// =====================================================

const VALID_ACTIONS = new Set([
  "log",
  "start",
  "end",
  "navigate",
  "none",
  "view",
  "review",
]);

const VALID_TYPES = new Set([
  "critical",
  "time",
  "pattern",
  "behavior",
  "guidance",
  "predictive", // ✅ FIX (was missing)
]);

// =====================================================
// 🧠 HELPERS
// =====================================================

function safeString(value: any, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: any, fallback = 0) {
  return typeof value === "number" && !isNaN(value) ? value : fallback;
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

// 🧠 Normalize IDs safely
function generateId(msg: any, index: number) {
  if (typeof msg?.id === "string" && msg.id.trim()) return msg.id;

  return `auto-${msg?.type || "msg"}-${index}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// 🧠 Normalize action labels
function getDefaultActionLabel(actionType: string) {
  switch (actionType) {
    case "log":
      return "Log";
    case "start":
      return "Start";
    case "end":
      return "End";
    case "navigate":
      return "Open";
    case "view":
      return "View";
    case "review":
      return "Review";
    default:
      return "Open";
  }
}

// =====================================================
// 🚀 MAIN NORMALIZER
// =====================================================

export function normalizeMessages(
  messages: any[]
): AssistantMessage[] {
  const now = Date.now();

  return messages
    .map((msg, index) => {
      if (!msg || typeof msg !== "object") return null;

      // ---------------- ID ----------------
      const id = generateId(msg, index);

      // ---------------- CONTENT ----------------
      const title = safeString(msg.title, "Untitled message");
      const description = safeString(msg.description);

      // ---------------- ACTION ----------------
      const actionType = VALID_ACTIONS.has(msg.actionType)
        ? msg.actionType
        : "none";

      const actionLabel =
        safeString(msg.actionLabel) ||
        getDefaultActionLabel(actionType);

      const actionPayload =
        typeof msg.actionPayload === "object"
          ? msg.actionPayload
          : undefined;

      // ---------------- TYPE ----------------
      const type = VALID_TYPES.has(msg.type)
        ? msg.type
        : "guidance";

      // ---------------- PRIORITY + SCORE ----------------
      const priority = clamp(safeNumber(msg.priority, 0), 0, 200);

      const score = clamp(
        safeNumber(msg.score, priority),
        0,
        200
      );

      // ---------------- TIME / LIFECYCLE ----------------
      const createdAt = safeNumber(msg.createdAt, now);

      const validUntil =
        typeof msg.validUntil === "number" ? msg.validUntil : undefined;

      const cooldownMs =
        typeof msg.cooldownMs === "number"
          ? msg.cooldownMs
          : undefined;

      // 🛑 Expiration filter
      if (validUntil && validUntil < now) {
        return null;
      }

      // ---------------- ENTITY ----------------
      const entityId =
        typeof msg.entityId === "string"
          ? msg.entityId
          : undefined;

      const signal =
        typeof msg.signal === "string" ? msg.signal : undefined;

      const signalKey =
        typeof msg.signalKey === "string" ? msg.signalKey : undefined;

      const generator =
        typeof msg.generator === "string" ? msg.generator : undefined;

      const evidence = Array.isArray(msg.evidence)
        ? msg.evidence.filter(
            (item: any) =>
              item &&
              typeof item === "object" &&
              typeof item.generator === "string" &&
              typeof item.title === "string"
          )
        : undefined;

      const mergeStrategy =
        msg.mergeStrategy === "dominant" || msg.mergeStrategy === "summary"
          ? msg.mergeStrategy
          : undefined;

      const confidence =
        typeof msg.confidence === "number" && !isNaN(msg.confidence)
          ? clamp(msg.confidence, 0, 1)
          : undefined;

      // ---------------- DEBUG ----------------
      const debug =
        typeof msg.debug === "object" ? msg.debug : undefined;

      const source =
        msg.source === "time" ||
        msg.source === "behavior" ||
        msg.source === "pattern" ||
        msg.source === "predictive" ||
        msg.source === "system"
          ? msg.source
          : undefined;

      const ui =
        typeof msg.ui === "object" && msg.ui !== null ? msg.ui : undefined;

      const category =
        msg.category === "sleep" ||
        msg.category === "feeding" ||
        msg.category === "health" ||
        msg.category === "activity" ||
        msg.category === "system"
          ? msg.category
          : undefined;

      // ---------------- FINAL MESSAGE ----------------
      return {
        id,
        title,
        description,
        actionLabel,
        actionType,
        actionPayload,
        type,
        signal,
        signalKey,
        generator,
        evidence,
        mergeStrategy,
        confidence,
        priority,
        score,
        entityId,
        validUntil,
        cooldownMs,
        createdAt,
        debug,
        ...(source ? { source } : {}),
        ...(ui ? { ui } : {}),
        ...(category ? { category } : {}),
      } as AssistantMessage;
    })
    .filter((msg): msg is AssistantMessage => Boolean(msg));
}