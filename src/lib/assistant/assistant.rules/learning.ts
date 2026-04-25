export const generateLearningMessages = (state: any) => {
  return [
    {
      id: "confidence",
      title: `High confidence: nap is likely needed now`,
      actionLabel: "Start Nap",
      actionType: "start",
      type: "pattern",
      priority: 75,
      score: 75,
    },
  ];
};

export default generateLearningMessages;