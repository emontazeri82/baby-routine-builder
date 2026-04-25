import type {
  AssistantEvidence,
  AssistantMessage,
  AssistantActionType,
} from "../assistant.types";

const ACTION_PRIORITY: Record<AssistantActionType, number> = {
  end: 6, // urgent fix
  log: 5, // important action
  start: 4, // next step
  review: 3, // deeper insight
  navigate: 2, // optional movement
  view: 1, // lightweight info
  none: 0,
};

function getSignalGroupKey(message: AssistantMessage) {
  return message.signalKey ?? message.signal ?? null;
}

function buildEvidence(messages: AssistantMessage[]): AssistantEvidence[] {
  return messages.map((message) => ({
    generator: message.generator ?? message.type,
    title: message.title,
    description: message.description,
    score: message.score,
    priority: message.priority,
  }));
}

function chooseBestAction(messages: AssistantMessage[]) {
  return [...messages].sort((a, b) => {
    const actionDiff =
      ACTION_PRIORITY[b.actionType] - ACTION_PRIORITY[a.actionType];
    if (actionDiff !== 0) return actionDiff;

    return b.priority + b.score - (a.priority + a.score);
  })[0];
}

function mergePriority(messages: AssistantMessage[]) {
  const maxPriority = Math.max(...messages.map((message) => message.priority));
  const corroborationBonus = Math.min(messages.length - 1, 2) * 5;
  return Math.min(200, maxPriority + corroborationBonus);
}

function mergeScore(messages: AssistantMessage[]) {
  const maxScore = Math.max(...messages.map((message) => message.score));
  const corroborationBonus = Math.min(messages.length - 1, 2) * 5;
  return Math.min(200, maxScore + corroborationBonus);
}

function buildSummaryDescription(messages: AssistantMessage[]) {
  const descriptions = messages
    .map((m) => m.description?.trim())
    .filter((d): d is string => Boolean(d));

  const unique = Array.from(new Set(descriptions));

  if (unique.length === 0) return "";

  if (unique.length === 1) return unique[0];

  return `${unique[0]} and ${unique[1].toLowerCase()}`;
}
function buildTitle(messages: AssistantMessage[]) {
  const signal = messages[0].signal;

  switch (signal) {
    case "sleep-urgency":
      return "Sleep is likely needed now";

    case "feeding-urgency":
      return "Feeding may be needed";

    default:
      return messages[0].title;
  }
}
function defaultMerge(messages: AssistantMessage[]): AssistantMessage {
  const ranked = [...messages].sort((a, b) => {
    const diff = b.priority + b.score - (a.priority + a.score);
    if (diff !== 0) return diff;
    return b.createdAt - a.createdAt;
  });

  const dominant = ranked[0];
  const actionSource = chooseBestAction(ranked);
  const evidence = buildEvidence(ranked);
  const summaryDescription = buildSummaryDescription(ranked);

  return {
    ...dominant,
    id: dominant.signalKey
      ? `signal:${dominant.signalKey}`
      : dominant.id,
    title: buildTitle(ranked),
    description: summaryDescription || dominant.description,
    actionLabel: actionSource.actionLabel,
    actionType: actionSource.actionType,
    actionPayload: actionSource.actionPayload,
    evidence,
    priority: mergePriority(ranked),
    score: mergeScore(ranked),
    confidence: Math.min(1, 0.5 + ranked.length * 0.15),
  };
}

export function aggregateSignals(
  messages: AssistantMessage[]
): AssistantMessage[] {
  const grouped = new Map<string, AssistantMessage[]>();
  const passthrough: AssistantMessage[] = [];

  for (const message of messages) {
    const key = getSignalGroupKey(message);

    if (!key) {
      passthrough.push(message);
      continue;
    }

    const list = grouped.get(key) ?? [];
    list.push(message);
    grouped.set(key, list);
  }

  const merged = Array.from(grouped.values()).map((group) => {
    if (group.length === 1) {
      const single = group[0];
      return {
        ...single,
        evidence: single.evidence ?? buildEvidence(group),
      };
    }

    return defaultMerge(group);
  });

  return [...passthrough, ...merged];
}

export default aggregateSignals;
