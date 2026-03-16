import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getTemperatureAnalytics } from "@/services/analytics/temperatureService";

function buildTemperatureMetrics(activity: any) {
  return {
    temperature: activity.temperature ?? 0
  };
}

export async function processTemperatureActivity(activity: any) {

  const metrics = buildTemperatureMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const temperatureAnalytics = await getTemperatureAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    temperature: temperatureAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    temperature: temperatureAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
