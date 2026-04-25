export const generateMultiSignalMessages = (state: any) => {
  const messages = [];

  if (state.awakeMinutes > 120 && !state.hasNapToday) {
    messages.push({
      id: "combined",
      title: `Long awake time + missed nap → sleep is strongly recommended`,
      actionLabel: "Start Sleep",
      actionType: "start",
      type: "critical",
      priority: 95,
      score: 95,
    });
  }

  if (state.patternDeviationScore > 0.6) {
    messages.push({
      id: "pattern-conflict",
      title: `Today’s routine differs from usual pattern`,
      actionLabel: "Review Day",
      actionType: "navigate",
      type: "pattern",
      priority: 70,
      score: 70,
    });
  }

  if (state.trendFeedingShorter) {
    messages.push({
      id: "trend",
      title: `Feeding intervals are becoming shorter over time`,
      actionLabel: "View Trend",
      actionType: "navigate",
      type: "pattern",
      priority: 65,
      score: 65,
    });
  }

  return messages;
};

export default generateMultiSignalMessages;