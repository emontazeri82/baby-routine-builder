import type { InsightResult, UIInsightSeverity } from "@/lib/insights/types";
import type { AssistantMessage } from "../assistant.types";

/* ---------------- PRIORITY MAPPING ---------------- */

function mapSeverityToPriority(severity?: UIInsightSeverity): number {
  switch (severity) {
    case "critical":
    case "strong":
      return 100;
    case "warning":
      return 80;
    case "info":
      return 50;
    case "success":
      return 30;
    default:
      return 50;
  }
}

/* ---------------- TYPE MAPPING ---------------- */

function mapInsightToType(severity?: UIInsightSeverity): AssistantMessage["type"] {
  switch (severity) {
    case "critical":
    case "strong":
      return "critical";
    case "warning":
      return "time";
    case "info":
      return "pattern";
    case "success":
    default:
      return "guidance";
  }
}

/* ---------------- HELPERS ---------------- */

function ensureId(id?: string): string {
  if (id && id.trim()) return id;

  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitMessage(message: string): {
  title: string;
  description?: string;
} {
  const parts = message.split(". ");

  if (parts.length > 1) {
    return {
      title: parts[0],
      description: parts.slice(1).join(". "),
    };
  }

  return { title: message };
}

/** Prefer structured title/body from engine; fall back to parsing message only. */
function getTitleAndDescription(insight: InsightResult) {
  if (typeof insight.title === "string" && insight.title.trim()) {
    return {
      title: insight.title.trim(),
      description: insight.message.trim() || undefined,
    };
  }
  return splitMessage(insight.message);
}

/* ---------------- ADAPTER ---------------- */

export const convertInsightsToMessages = (
  insights: InsightResult[]
): AssistantMessage[] => {
  if (!Array.isArray(insights) || insights.length === 0) {
    return [];
  }

  return insights
    .filter(
      (insight): insight is InsightResult =>
        Boolean(
          insight &&
          typeof insight.message === "string" &&
          insight.message.trim().length > 0
        )
    )
    .map((insight) => {
      const id = ensureId(insight.id);

      const { title, description } = getTitleAndDescription(insight);

      const priority = mapSeverityToPriority(insight.severity);

      return {
        /* 🔑 Identity */
        id: `insight-${id}`,

        /* 🧾 Content */
        title,
        description,

        /* 🎯 Action */
        actionLabel:
          (typeof insight.actionLabel === "string" && insight.actionLabel.trim()
            ? insight.actionLabel.trim()
            : undefined) ??
          (insight.actionUrl ? "Review" : "View"),
        actionType: insight.actionUrl ? "review" : "view",
        actionPayload: insight.actionUrl
          ? { route: insight.actionUrl }
          : undefined,

        /* 🧠 Classification */
        type: mapInsightToType(insight.severity),

        /* 📊 Ranking */
        priority,
        score: insight.score ?? priority,

        /* 🔗 Linking — omit babyId here; it caused global dedupe to collapse all insights */
        entityId: undefined,

        /* ⏳ Lifecycle */
        createdAt:
          insight.createdAt instanceof Date
            ? insight.createdAt.getTime()
            : insight.createdAt
              ? new Date(insight.createdAt).getTime()
              : Date.now(),

        validUntil:
          insight.expiresAt instanceof Date
            ? insight.expiresAt.getTime()
            : insight.expiresAt
              ? new Date(insight.expiresAt).getTime()
              : undefined,

        cooldownMs: 1000 * 60 * 10, // 10 minutes

        /* 🧠 Debug */
        source: "system",
        debug: {
          rule: "insight-adapter",
          confidence: insight.score ?? 0.7,
          context: {
            category: insight.category,
            insightType: insight.type,
            /** Preserved for dashboard UI; `toDashboardInsight` prefers this over `type` mapping. */
            originalSeverity: insight.severity,
          },
        },
      };
    });
};

export default convertInsightsToMessages;
