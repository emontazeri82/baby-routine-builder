export const generatePriorityMessage = (state: any) => {
  return [
    {
      id: "top-action",
      title: `Sleep is the most important next step right now`,
      actionLabel: "Start Sleep",
      actionType: "start",
      type: "critical",
      priority: 120,
      score: 120,
    },
  ];
};

export default generatePriorityMessage;