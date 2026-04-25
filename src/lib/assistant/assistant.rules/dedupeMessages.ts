import type { AssistantMessage } from "../assistant.types";

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function dedupeMessages(messages: AssistantMessage[]): AssistantMessage[] {
  const byId = new Map();
  const byTitle = new Map();

  messages.forEach((msg) => {
    // 🔴 Step 1: ID-based dedupe (strongest)
    if (!byId.has(msg.id) || msg.score > byId.get(msg.id).score) {
      byId.set(msg.id, msg);
    }
  });

  const idFiltered = Array.from(byId.values());

  idFiltered.forEach((msg) => {
    const key =
      typeof msg.id === "string" && msg.id.startsWith("insight-")
        ? msg.id
        : normalizeTitle(msg.title);

    // 🟡 Step 2: Title-based dedupe (prevents similar spam)
    if (!byTitle.has(key) || msg.score > byTitle.get(key).score) {
      byTitle.set(key, msg);
    }
  });

  let result = Array.from(byTitle.values());

  // 🔵 Step 3: Entity dedupe (avoid same activity spam).
  // Processor insights use babyId as entityId — without this exclusion, only one insight per
  // AssistantMessage.type survives (`pattern-<babyId>`, etc.).
  const entityMap = new Map<string, AssistantMessage>();

  result.forEach((msg) => {
    if (!msg.entityId || msg.id.startsWith("insight-")) return;

    const key = `${msg.type}-${msg.entityId}`;

    if (!entityMap.has(key) || msg.score > entityMap.get(key)!.score) {
      entityMap.set(key, msg);
    }
  });

  const entityFiltered = Array.from(entityMap.values());

  const nonEntityMessages = result.filter(
    (m) => !m.entityId || m.id.startsWith("insight-")
  );

  result = [...entityFiltered, ...nonEntityMessages];

  return result;
}

export default dedupeMessages;