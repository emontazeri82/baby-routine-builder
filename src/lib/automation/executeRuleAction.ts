export type RuleActionType =
  | "create_reminder"
  | "send_notification"
  | "log_event";

type RuleAction = {
  type: RuleActionType;
  delayMinutes?: number;
  message?: string;
};

export async function executeRuleAction(
  action: RuleAction,
  rule: any,
  context: any
) {

  switch (action.type) {

    case "create_reminder":

      console.log(
        `Automation reminder triggered by ${rule.id}`
      );

      // Example
      // await createReminder({
      //   babyId: context.babyId,
      //   delayMinutes: action.delayMinutes
      // });

      break;

    case "send_notification":

      console.log(
        `Automation notification: ${action.message}`
      );

      break;

    case "log_event":

      console.log(
        `Automation event logged for rule ${rule.id}`
      );

      break;

  }

}