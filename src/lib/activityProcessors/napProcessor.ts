import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getNapAnalytics } from "@/services/analytics/napService";

function buildNapMetrics(activity: any) {
  return {
    nap_count: activity.count ?? 0,
    nap_duration: activity.durationMinutes ?? 0
  };
}

export async function processNapActivity(activity: any) {

  const metrics = buildNapMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const napAnalytics = await getNapAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    nap: napAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    nap: napAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
