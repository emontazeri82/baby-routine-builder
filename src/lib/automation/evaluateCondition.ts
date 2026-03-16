export type RuleOperator =
  | "<"
  | ">"
  | "="
  | "<="
  | ">="
  | "!=";

export function evaluateCondition(
  operator: RuleOperator,
  actualValue: number | undefined,
  expectedValue: number
): boolean {

  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  switch (operator) {

    case "<":
      return actualValue < expectedValue;

    case ">":
      return actualValue > expectedValue;

    case "=":
      return actualValue === expectedValue;

    case "!=":
      return actualValue !== expectedValue;

    case "<=":
      return actualValue <= expectedValue;

    case ">=":
      return actualValue >= expectedValue;

    default:
      return false;
  }

}