export const generateContextMessages = (state: any) => {
  const messages = [];
  const hour = state.now.getHours();

  if (hour >= 18) {
    messages.push({
      id: "evening-sleep",
      title: `It’s evening — preparing for sleep may help routine`,
      actionLabel: "Start Sleep",
      actionType: "start",
      type: "time",
      priority: 70,
      score: 70,
    });
  }

  if (state.lastActivity?.activityName === "Feeding") {
    messages.push({
      id: "sequence",
      title: `After feeding, sleep usually follows — consider starting sleep`,
      actionLabel: "Start Sleep",
      actionType: "start",
      type: "pattern",
      priority: 65,
      score: 65,
    });
  }

  return messages;
};

export default generateContextMessages;