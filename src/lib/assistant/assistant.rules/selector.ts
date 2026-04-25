import { AssistantMessage } from "../assistant.types";

const GLOBAL_LIMIT = 10;

// 🔥 Type weighting (tuned for importance)
const TYPE_PRIORITY: Record<string, number> = {
  critical: 100,
  predictive: 90,
  time: 80,
  pattern: 70,
  behavior: 60,
  guidance: 50,
};

// 🧠 Recency boost (newer = higher priority)
function getRecencyBoost(msg: AssistantMessage) {
  const ageMs = Date.now() - (msg.createdAt ?? 0);
  const minutes = ageMs / 60000;

  if (minutes < 5) return 15;
  if (minutes < 30) return 10;
  if (minutes < 120) return 5;
  return 0;
}

// 🧠 Context key (group similar messages)
function getContextKey(msg: AssistantMessage) {
  if (typeof msg.id === "string" && msg.id.startsWith("insight-")) {
    return msg.id;
  }

  if (msg.entityId) {
    return `${msg.entityId}:${msg.id}`;
  }

  if (msg.id?.includes("-")) {
    return msg.id.split("-")[0];
  }

  return msg.title.toLowerCase().trim();
}

// =====================================================
// 🔥 ADVANCED DEDUPE (CONTEXT-AWARE)
// =====================================================

function dedupeMessages(messages: AssistantMessage[]) {
  const map = new Map<string, AssistantMessage>();

  for (const msg of messages) {
    const key = getContextKey(msg);

    if (!map.has(key)) {
      map.set(key, msg);
      continue;
    }

    const existing = map.get(key)!;

    const existingScore =
      (existing.priority ?? 0) * 2 + (existing.score ?? 0);
    const newScore =
      (msg.priority ?? 0) * 2 + (msg.score ?? 0);

    if (newScore > existingScore) {
      map.set(key, msg);
    }
  }

  return Array.from(map.values());
}

// =====================================================
// 🧠 LIFECYCLE FILTER (EXPIRATION)
// =====================================================

function filterExpired(messages: AssistantMessage[]) {
  const now = Date.now();

  return messages.filter((msg) => {
    if (!msg.validUntil) return true;
    return msg.validUntil > now;
  });
}

// =====================================================
// 🧠 SORT ENGINE (CORE DECISION LOGIC)
// =====================================================

function sortMessages(messages: AssistantMessage[]) {
  return messages
    .map((msg, index) => ({
      ...msg,
      _index: index,
      _finalScore:
        (msg.priority ?? 0) * 2 +
        (msg.score ?? 0) +
        (TYPE_PRIORITY[msg.type] ?? 0) +
        getRecencyBoost(msg),
    }))
    .sort((a, b) => {
      const diff = b._finalScore - a._finalScore;
      if (diff !== 0) return diff;

      // fallback: newer first
      const timeDiff = (b.createdAt ?? 0) - (a.createdAt ?? 0);
      if (timeDiff !== 0) return timeDiff;

      return a._index - b._index;
    })
    .map(({ _index, _finalScore, ...rest }) => rest);
}

// =====================================================
// 🧠 DIVERSITY CONTROL (SMART BALANCING)
// =====================================================

function insightCategory(msg: AssistantMessage): string | null {
  if (typeof msg.id !== "string" || !msg.id.startsWith("insight-")) {
    return null;
  }
  const cat = msg.debug?.context?.category;
  return typeof cat === "string" && cat.length > 0 ? cat : null;
}

/**
 * Rule-engine messages are capped by coarse `type` (many insights share "pattern"/"guidance").
 * Insight rows from processors include `debug.context.category` — allow **one surfaced row per
 * category** so diaper/medicine/play/etc. are not crowded out by a single winning "pattern".
 */
function enforceDiversity(messages: AssistantMessage[]) {
  const result: AssistantMessage[] = [];
  const typeCount: Record<string, number> = {};
  const insightSeen = new Set<string>();

  for (const msg of messages) {
    const cat = insightCategory(msg);

    if (cat) {
      if (insightSeen.has(cat)) {
        continue;
      }
      insightSeen.add(cat);
      result.push(msg);
      continue;
    }

    const count = typeCount[msg.type] ?? 0;

    const limit =
      msg.type === "critical"
        ? 3
        : msg.type === "predictive"
          ? 3
          : msg.type === "time"
            ? 3
            : msg.type === "pattern"
              ? 2
              : msg.type === "guidance"
                ? 2
                : 1;

    if (count < limit || result.length < 3) {
      result.push(msg);
      typeCount[msg.type] = count + 1;
    }
  }

  return result;
}

// =====================================================
// 🧠 MAIN SELECTOR (FINAL PIPELINE)
// =====================================================

export function selectBestMessages(
  messages: AssistantMessage[]
): AssistantMessage[] {
  if (!messages?.length) return [];

  // 1. Remove expired
  const valid = filterExpired(messages);

  // 2. Context-aware dedupe
  const deduped = dedupeMessages(valid);

  // 3. Sort (core ranking)
  let ranked = sortMessages(deduped);

  // 4. Diversity balancing
  ranked = enforceDiversity(ranked);

  // 5. Final limit
  const final = ranked.slice(0, GLOBAL_LIMIT);

  // 🔍 Debug (very useful for tuning)
  if (process.env.NODE_ENV === "development") {
    console.log("[Assistant Selector Debug]", {
      totalInput: messages.length,
      afterExpireFilter: valid.length,
      afterDedupe: deduped.length,
      finalMessages: final.map((m, index) => ({
        rank: index + 1,
        id: m.id,
        type: m.type,
        priority: m.priority,
        score: m.score,
        title: m.title,
      })),
    });
  }

  return final;
}