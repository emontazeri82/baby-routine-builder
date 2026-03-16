import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getPlayAnalytics } from "@/services/analytics/playSrevice";

function buildPlayMetrics(activity: any) {
  return {
    play_minutes: activity.durationMinutes ?? 0
  };
}

export async function processPlayActivity(activity: any) {

  const metrics = buildPlayMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const playAnalytics = await getPlayAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    play: playAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    play: playAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
