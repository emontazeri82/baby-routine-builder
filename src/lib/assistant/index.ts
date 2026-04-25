/** Bar-facing assistant pipeline — import from concrete modules as needed. */
export { generateAssistantRules } from "./assistant.rules/index";
export { buildDerivedState } from "./buildDerivedState";
export { runInsightProcessors } from "./processors/runInsightProcessors";
export type { AssistantMessage, AssistantMessageType } from "./assistant.types";
export type { AssistantDerivedState, ActivityLike } from "./buildDerivedState";
