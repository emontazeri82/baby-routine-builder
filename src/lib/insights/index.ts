import { generateFeedingInsights } from "./feedingInsights";
import { generateSleepInsights } from "./sleepInsights";
import { generateGrowthInsights } from "./growthInsights";
import { generateReminderInsights } from "./reminderInsights";
import { generateDiaperInsights } from "./diaperInsights";
import { DashboardInsight } from "./types";

export function generateDashboardInsights({
  feeding,
  sleep,
  growth,
  diaper,
  remindersCount,
}: any): DashboardInsight[] {
  const allInsights = [
    ...generateFeedingInsights(feeding),
    ...generateSleepInsights(sleep),
    ...generateGrowthInsights(growth),
    ...generateDiaperInsights(diaper),
    ...generateReminderInsights(remindersCount),
  ];

  const severityRank: Record<
    DashboardInsight["severity"],
    number
  > = {
    critical: 4,
    warning: 3,
    info: 2,
    success: 1,
  };

  return allInsights.sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );
}
