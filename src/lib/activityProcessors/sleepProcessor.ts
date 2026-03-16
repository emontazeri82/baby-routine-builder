import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getSleepSummary } from "@/services/analytics/sleepService";

function buildSleepMetrics(activity: any) {

  return {
    sleep_duration: activity.durationMinutes ?? 0,
    nap_count: activity.napsToday ?? 0
  };

}

export async function processSleepActivity(activity: any) {

  const metrics = buildSleepMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const sleepSummary = await getSleepSummary(activity.babyId, days);

  const sleepData = sleepSummary
    ? { ...sleepSummary, summary: sleepSummary }
    : null;

  const insights = generateDashboardInsights({
    sleep: sleepData,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    sleep: sleepData
  });

  return {
    metrics,
    insights,
    routines
  };
}
