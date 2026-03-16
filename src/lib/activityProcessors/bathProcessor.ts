import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getBathAnalytics } from "@/services/analytics/bathService";

function buildBathMetrics(activity: any) {
  return {
    bath_days_since: activity.daysSinceLastBath ?? 0
  };
}

export async function processBathActivity(activity: any) {

  const metrics = buildBathMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const bathAnalytics = await getBathAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    bath: bathAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    bath: bathAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
