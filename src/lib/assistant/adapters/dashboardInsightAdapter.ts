import type { AssistantMessage } from "../assistant.types";
import type {
  DashboardInsight,
  InsightCategory,
  InsightSeverity,
} from "@/lib/insights/types";

function isInsightSeverity(
  s: unknown
): s is InsightSeverity {
  return (
    s === "critical" ||
    s === "strong" ||
    s === "warning" ||
    s === "info" ||
    s === "success"
  );
}

/* ---------------- CATEGORY MAPPING ---------------- */

function mapCategory(category?: string): InsightCategory {
  switch (category) {
    case "feeding":
    case "sleep":
    case "growth":
    case "reminder":
    case "diaper":
    case "play":
    case "bath":
    case "medicine":
    case "temperature":
    case "nap":
    case "pumping":
      return category;

    default:
      return "reminder"; // fallback (safe default)
  }
}

/* ---------------- SEVERITY MAPPING ---------------- */

function mapSeverity(type?: AssistantMessage["type"]): InsightSeverity {
  switch (type) {
    case "critical":
      return "critical";
    case "time":
      return "warning";
    case "pattern":
      return "info";
    case "behavior":
      return "info";
    case "predictive":
      return "strong";
    case "guidance":
    default:
      return "success";
  }
}

/* ---------------- ACTION URL BUILDER ---------------- */

function buildUrl(msg: AssistantMessage): string | undefined {
  if (msg.actionPayload?.route) {
    return msg.actionPayload.route;
  }
  return undefined;
}

/* ---------------- MAIN ADAPTER ---------------- */

export function toDashboardInsight(
  msg: AssistantMessage
): DashboardInsight {
  const fromEngine = msg.debug?.context?.originalSeverity;
  const severity: InsightSeverity = isInsightSeverity(fromEngine)
    ? fromEngine
    : mapSeverity(msg.type);

  return {
    id: msg.id,

    category: mapCategory(msg.debug?.context?.category),
    severity,

    title: msg.title,
    message: msg.description || "",

    actionLabel: msg.actionLabel,
    actionUrl: buildUrl(msg),

    score: msg.score,

    createdAt: msg.createdAt
      ? new Date(msg.createdAt)
      : undefined,
  };
}

/* ---------------- BULK HELPER ---------------- */

export function toDashboardInsights(
  messages: AssistantMessage[]
): DashboardInsight[] {
  return messages.map(toDashboardInsight);
}