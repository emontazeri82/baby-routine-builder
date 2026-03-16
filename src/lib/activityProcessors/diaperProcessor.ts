import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getDiaperSummary } from "@/services/analytics/diaperService";

function buildDiaperMetrics(activity: any) {

  return {
    diaper_frequency: activity.totalWet ?? 0
  };

}

export async function processDiaperActivity(activity: any) {

  const metrics = buildDiaperMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const diaperSummary = await getDiaperSummary(
    activity.babyId,
    days
  );

  const insights = generateDashboardInsights({
    diaper: diaperSummary,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    diaper: diaperSummary
  });

  return {
    metrics,
    insights,
    routines
  };
}
