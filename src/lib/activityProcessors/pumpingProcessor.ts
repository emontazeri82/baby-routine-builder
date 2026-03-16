import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getPumpingAnalytics } from "@/services/analytics/pumpingService";

function buildPumpingMetrics(activity: any) {
  return {
    pumping_output: activity.amountMl ?? 0
  };
}

export async function processPumpingActivity(activity: any) {

  const metrics = buildPumpingMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const pumpingAnalytics = await getPumpingAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    pumping: pumpingAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    pumping: pumpingAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
