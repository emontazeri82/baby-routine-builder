import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getFeedingSummary } from "@/services/analytics/feedingService";

function buildFeedingMetrics(activity: any) {

  return {
    feeding_interval: activity.intervalMinutes ?? 0
  };

}

export async function processFeedingActivity(activity: any) {

  const metrics = buildFeedingMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const feedingSummary = await getFeedingSummary(
    activity.babyId,
    days
  );

  const feedingData = feedingSummary
    ? { ...feedingSummary, summary: feedingSummary }
    : null;

  const insights = generateDashboardInsights({
    feeding: feedingData,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    feeding: feedingData
  });

  return {
    metrics,
    insights,
    routines
  };
}
