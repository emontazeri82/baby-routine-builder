export function generateGuidanceMessages(_state?: unknown) {
  const createdAt = Date.now();

  return [
    {
      id: "summary",
      title: "View today's summary",
      description: "Check overall activity insights",
      actionLabel: "Open",
      actionType: "navigate",
      type: "guidance",
      priority: 20,
      score: 20,
      createdAt,
    },
    {
      id: "insights",
      title: "View activity insights",
      description: "See trends and patterns",
      actionLabel: "View Insights",
      actionType: "navigate",
      type: "guidance",
      priority: 25,
      score: 25,
      createdAt,
    },
  ];
}