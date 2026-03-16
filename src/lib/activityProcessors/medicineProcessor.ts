import { runRuleEngine } from "@/lib/automation/ruleEngine";
import { automationRules } from "@/lib/automation/defaultRules";
import { generateDashboardInsights } from "@/lib/insights";
import { generateRoutinePredictions } from "@/lib/insights/routinePredictionEngine";
import { getMedicineAnalytics } from "@/services/analytics/medicineService";

function buildMedicineMetrics(activity: any) {
  return {
    medicine_missed: activity.missedDoses ?? 0
  };
}

export async function processMedicineActivity(activity: any) {

  const metrics = buildMedicineMetrics(activity);

  await runRuleEngine(metrics, automationRules);

  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const medicineAnalytics = await getMedicineAnalytics({
    babyId: activity.babyId,
    startDate,
    endDate
  });

  const insights = generateDashboardInsights({
    medicine: medicineAnalytics,
    remindersCount: 0,
    days
  });

  const routines = generateRoutinePredictions({
    medicine: medicineAnalytics
  });

  return {
    metrics,
    insights,
    routines
  };
}
