import type { AssistantMessage } from "../assistant.types";
import type { AssistantDerivedState } from "../buildDerivedState";

export type AssistantRuleGenerator = (
  state: AssistantDerivedState
) => Partial<AssistantMessage>[];

export type AssistantRuleMessage = Partial<AssistantMessage>;