import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getGrowthSummary } from "@/services/analytics/growthService";

function buildGrowthMetrics(metadata: any) {
  return {
    growth_weight_gain: metadata.weight ?? 0,
    growth_height: metadata.height ?? 0,
    growth_head: metadata.headCircumference ?? 0
  };
}

export async function processGrowthActivity(activity: any) {

  const growthSummary = activity?.metadata ?? activity;

  const metrics = buildGrowthMetrics(growthSummary);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const summaryFromDb = await getGrowthSummary(
    activity.babyId,
    days
  );

  const growthData = summaryFromDb
    ? { ...summaryFromDb, summary: summaryFromDb }
    : null;

  const insights = generateDashboardInsights({
    growth: growthData,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    growth: growthData
  });

  return {
    metrics,
    insights,
    routines
  };
}
