export const generateAnomalyMessages = (state: any) => {
  const messages = [];

  if (state.todaySleep < state.avgSleep) {
    messages.push({
      id: "sleep-short",
      title: `Sleep duration today is shorter than usual`,
      actionLabel: "Review Sleep",
      actionType: "navigate",
      type: "pattern",
      priority: 75,
      score: 75,
    });
  }

  if (!state.countByType?.Bath) {
    messages.push({
      id: "missing-bath",
      title: `Bath hasn’t been logged today — usually happens daily`,
      actionLabel: "Log Bath",
      actionType: "log",
      type: "pattern",
      priority: 70,
      score: 70,
    });
  }

  if (state.minutesSinceLastFeeding > state.avgFeedingInterval * 1.5) {
    messages.push({
      id: "feeding-gap",
      title: `There’s a longer gap than usual between feedings`,
      actionLabel: "Log Feeding",
      actionType: "log",
      type: "pattern",
      priority: 85,
      score: 85,
    });
  }

  return messages;
};

export default generateAnomalyMessages;