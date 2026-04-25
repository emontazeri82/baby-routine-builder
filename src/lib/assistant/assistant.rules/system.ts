export const generateSystemMessages = (state: any) => {
  const messages = [];

  if (state.openActivities.length > 0) {
    messages.push({
      id: "open",
      title: `${state.openActivities.length} activities are still running — review them`,
      actionLabel: "Review",
      actionType: "navigate",
      type: "critical",
      priority: 100,
      score: 100,
    });
  }

  if (state.openActivities.length > 3) {
    messages.push({
      id: "multi-issues",
      title: `Several activities need attention`,
      actionLabel: "Review All",
      actionType: "navigate",
      type: "critical",
      priority: 95,
      score: 95,
    });
  }

  return messages;
};

export default generateSystemMessages;