import { generateFeedingInsights } from "./modules/feedingInsights";
import { generateSleepInsights } from "./modules/sleepInsights";
import { generateGrowthInsights } from "./modules/growthInsights";
import { generateReminderInsights } from "./reminderInsights";
import { generateDiaperInsights } from "./modules/diaperInsights";
import { generatePlayInsights } from "./modules/playInsights";
import { generateBathInsights } from "./modules/bathInsights";
import { generateMedicineInsights } from "./modules/medicineInsights";
import { generateTemperatureInsights } from "./modules/temperatureInsights";
import { generatePumpingInsights } from "./modules/pumpingInsights";
import { generateNapInsights } from "./modules/napInsights";
import { generatePredictiveInsights } from "./predictiveInsights";
import { DashboardInsight } from "./types";
import { generateRoutinePredictions } from "./routinePredictionEngine";
import { runSleepInsights } from "./modules/sleepInsights";
import { runFeedingInsights } from "./modules/feedingInsights";
import { runDiaperInsights } from "./modules/diaperInsights";
import { runRoutineInsights } from "./routineInsights";
import { runDevelopmentInsights } from "./developmentInsights";
import { runNapInsights } from "./modules/napInsights";
import { runBathInsights } from "./modules/bathInsights";
import { runPlayInsights } from "./modules/playInsights";
import { runMedicineInsights } from "./modules/medicineInsights";
import { runTemperatureInsights } from "./modules/temperatureInsights";
import { runPumpingInsights } from "./modules/pumpingInsights";
import { runGrowthInsights } from "./modules/growthInsights";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { saveInsights } from "@/lib/insights/saveInsights";
/* ------------------------------------------------
   Insight Engine Input Type
------------------------------------------------ */

type InsightEngineInput = {
  feeding?: unknown;
  sleep?: unknown;
  growth?: unknown;
  diaper?: unknown;
  play?: unknown;
  bath?: unknown;
  medicine?: unknown;
  temperature?: unknown;
  nap?: unknown;
  pumping?: unknown;
  remindersCount: number;
  days: number;
};

/* ------------------------------------------------
   Severity Ranking
------------------------------------------------ */

const severityRank: Record<DashboardInsight["severity"], number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
};

/* ------------------------------------------------
   Insight Engine
------------------------------------------------ */

export function generateDashboardInsights(
  input: InsightEngineInput
): DashboardInsight[] {

  const {
    feeding,
    sleep,
    growth,
    diaper,
    play,
    bath,
    medicine,
    temperature,
    nap,
    pumping,
    remindersCount,
    days,
  } = input;

  const allInsights: DashboardInsight[] = [

    /* ---------- Activity Insights ---------- */

    ...generateFeedingInsights(feeding),
    ...generateSleepInsights(sleep),
    ...generateGrowthInsights(growth),
    ...generateDiaperInsights(diaper),

    ...generatePlayInsights(
      play as Parameters<typeof generatePlayInsights>[0],
      days
    ),

    ...generateBathInsights(
      bath as Parameters<typeof generateBathInsights>[0]
    ),

    ...generateMedicineInsights(
      medicine as Parameters<typeof generateMedicineInsights>[0]
    ),

    ...generateTemperatureInsights(
      temperature as Parameters<typeof generateTemperatureInsights>[0]
    ),

    ...generateNapInsights(
      nap as Parameters<typeof generateNapInsights>[0]
    ),

    ...generatePumpingInsights(
      pumping as Parameters<typeof generatePumpingInsights>[0],
      days
    ),

    /* ---------- Predictive Intelligence ---------- */

    ...generatePredictiveInsights({
      feeding,
      sleep,
      growth,
      diaper,
      play,
      bath,
      medicine,
      temperature,
      nap,
      pumping,
      remindersCount,
    }),

    /* ---------- Routine Intelligence ---------- */
    ...generateRoutinePredictions({
      feeding,
      sleep,
      growth,
      diaper,
      play,
      bath,
      medicine,
      temperature,
      nap,
      pumping,
    }),
    /* ---------- Reminder Insights ---------- */

    ...generateReminderInsights(remindersCount),
  ];

  /* ------------------------------------------------
     Remove Duplicate Insights
  ------------------------------------------------ */

  const uniqueInsights = Array.from(
    new Map(allInsights.map(i => [i.id, i])).values()
  );

  /* ------------------------------------------------
     Sort by Severity
  ------------------------------------------------ */

  return uniqueInsights.sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );
}

export async function runInsightProcessors(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
  expireStale?: boolean;
}) {
  const {
    babyId,
    activityId = null,
    days = 7,
    expireStale = true,
  } = params;
  const results = await Promise.all([
    runSleepInsights({ babyId, activityId, days }),
    runFeedingInsights({ babyId, activityId, days }),
    runDiaperInsights({ babyId, activityId, days }),
    runRoutineInsights({ babyId, activityId, days }),
    runDevelopmentInsights({ babyId, activityId, days }),
    runNapInsights({ babyId, activityId, days }),
    runBathInsights({ babyId, activityId, days }),
    runPlayInsights({ babyId, activityId, days }),
    runMedicineInsights({ babyId, activityId, days }),
    runTemperatureInsights({ babyId, activityId, days }),
    runPumpingInsights({ babyId, activityId, days }),
    runGrowthInsights({ babyId, activityId, days }),
  ]);

  const generated = results.flat();
  const generatedKeys = [...new Set(generated.map((i) => i.id))];

  if (generated.length > 0) {
    await saveInsights(babyId, activityId, generated);
  }

  if (expireStale) {
    const now = new Date();
    await db
      .update(insights)
      .set({
        expiredAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(insights.babyId, babyId),
          isNull(insights.expiredAt),
          notInArray(insights.insightKey, generatedKeys)
        )
      );
  }

  return generated;
}
