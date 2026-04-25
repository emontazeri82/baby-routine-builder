import { formatDuration } from "../assistant.utils";
export const generateCriticalMessages = (state: any) => {
  const messages = [];
  const nowTime = state?.now instanceof Date ? state.now.getTime() : Date.now();

  // GROUPED open activities
  if (state.openActivities.length > 0) {
    const count = state.openActivities.length;

    messages.push({
      id: "open-activities",
      title:
        count === 1
          ? `${state.openActivities[0].activityName} is still running • ${formatDuration(
            Math.floor(
              (nowTime -
                new Date(state.openActivities[0].startTime).getTime()) /
              60000
            )
          )}`
          : `${count} activities are still running`,
      description: "Finish them to keep tracking accurate",
      actionLabel: count === 1 ? "End Now" : "Review",
      actionType: count === 1 ? "end" : "navigate",
      type: "critical",
      signal: "open-activity",
      signalKey:
        count === 1
          ? `open-activity:${state.openActivities[0].activityName ?? "unknown"}`
          : "open-activity:multiple",
      generator: "critical",
      mergeStrategy: "dominant",
      priority: 100,
      score: 100,
    });
  }

  // NO ACTIVITY
  // NO / LOW ACTIVITY (SMART COMBINED MESSAGE)
  if (state.now.getHours() >= 8) {
    const count = state.todayActivities.length;

    if (count === 0) {
      messages.push({
        id: "low-activity",
        title: "No activity logged today",
        description:
          "Start tracking to build accurate routine insights and predictions",
        actionLabel: "Quick Log",
        actionType: "log",
        type: "critical",
        signal: "low-logging",
        signalKey: "low-logging",
        generator: "critical",
        mergeStrategy: "summary",
        priority: 98,
        score: 98,
        cooldownMs: 60 * 60 * 1000,
      });
    } else if (count < 3) {
      messages.push({
        id: "low-activity",
        title: "Activity tracking is low today",
        description:
          "Logging more activities improves routine accuracy and predictions",
        actionLabel: "Quick Log",
        actionType: "log",
        type: "critical",
        signal: "low-logging",
        signalKey: "low-logging",
        generator: "critical",
        mergeStrategy: "summary",
        priority: 85,
        score: 85,
      });
    }
  }

  // EXTREME duration
  const extreme = state.openActivities.find((activity: any) => {
    if (!activity?.startTime) return false;

    const startTime = new Date(activity.startTime).getTime();
    if (isNaN(startTime)) return false;

    const minutes = (nowTime - startTime) / 60000;
    return minutes > 720;
  });
  if (extreme) {
    messages.push({
      id: "extreme-duration",
      title: `${extreme.activityName} has been running for ${formatDuration(
        Math.floor(
          (nowTime - new Date(extreme.startTime).getTime()) / 60000
        )
      )}`,
      description: "This likely needs correction",
      actionLabel: "Fix Now",
      actionType: "end",
      type: "critical",
      signal: "open-activity",
      signalKey: `open-activity:${extreme.activityName ?? "unknown"}`,
      generator: "critical",
      mergeStrategy: "dominant",
      priority: 120,
      score: 120,
      entityId: extreme.id,
    });
  }

  return messages;
};

export default generateCriticalMessages;