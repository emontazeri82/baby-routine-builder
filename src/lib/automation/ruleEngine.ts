import { evaluateCondition } from "./evaluateCondition";
import { executeRuleAction } from "./executeRuleAction";

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

export async function runRuleEngine(
  metrics: Record<string, number>,
  rules: AutomationRule[]
) {

  for (const rule of rules) {

    const conditionsPassed = rule.conditions.every(c => {

      const actualValue = metrics[c.metric];

      return evaluateCondition(
        c.operator,
        actualValue,
        c.value
      );

    });

    if (!conditionsPassed) continue;

    for (const action of rule.actions) {

      await executeRuleAction(
        action,
        rule,
        metrics
      );

    }

  }

}