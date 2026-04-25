export const generateMicroMessages = (state: any) => {
  return [
    {
      id: "almost-perfect",
      title: `You’re close to maintaining a perfect routine today`,
      actionLabel: "Continue",
      actionType: "none",
      type: "guidance",
      priority: 30,
      score: 30,
    },
    {
      id: "positive",
      title: `Great job — today’s routine is well balanced`,
      actionLabel: "View Summary",
      actionType: "navigate",
      type: "guidance",
      priority: 35,
      score: 35,
    },
  ];
};

export default generateMicroMessages;