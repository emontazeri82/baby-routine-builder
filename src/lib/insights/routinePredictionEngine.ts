import { DashboardInsight } from "./types";

type RoutineInput = {
  feeding?: any;
  sleep?: any;
  growth?: any;
  diaper?: any;
  play?: any;
  bath?: any;
  medicine?: any;
  temperature?: any;
  nap?: any;
  pumping?: any;
};

export function generateRoutinePredictions(
  data: RoutineInput
): DashboardInsight[] {

  const insights: DashboardInsight[] = [];

  const feeding = data.feeding?.summary;
  const sleep = data.sleep?.summary;
  const growth = data.growth?.summary;
  const diaper = data.diaper?.summary;
  const play = data.play?.summary;
  const bath = data.bath?.summary;
  const medicine = data.medicine?.summary;
  const temperature = data.temperature?.summary;
  const nap = data.nap?.summary;
  const pumping = data.pumping?.summary;

  /* ------------------------------------------------
     😴 Sleep Routine
  ------------------------------------------------ */

  if (sleep) {

    if (sleep.avgBedtimeMinutes !== undefined) {

      const hour = Math.floor(sleep.avgBedtimeMinutes / 60);

      insights.push({
        id: "routine-sleep-routine-detected",
        category: "sleep",
        severity: "info",
        title: "Bedtime Routine Detected",
        message: `Baby usually goes to sleep around ${hour}:00.`,
        actionLabel: "View Sleep Analytics",
        actionUrl: "#sleep",
      });

    }

    if (sleep.consistencyScore > 80) {

      insights.push({
        id: "routine-sleep-routine-consistent",
        category: "sleep",
        severity: "success",
        title: "Consistent Sleep Routine",
        message:
          "Sleep patterns appear stable and predictable.",
      });

    }

  }

  /* ------------------------------------------------
     😴 Nap Routine
  ------------------------------------------------ */

  if (nap) {

    if (nap.avgNapsPerDay >= 2) {

      insights.push({
        id: "routine-nap-routine-detected",
        category: "nap",
        severity: "info",
        title: "Nap Routine Detected",
        message:
          `Baby averages ${nap.avgNapsPerDay.toFixed(1)} naps per day.`,
        actionLabel: "View Nap Analytics",
        actionUrl: "#nap",
      });

    }

    if (nap.assistedRatioPercent > 60) {

      insights.push({
        id: "routine-nap-assistance-pattern",
        category: "nap",
        severity: "info",
        title: "Assisted Nap Pattern",
        message:
          "Baby frequently requires assistance to fall asleep for naps.",
      });

    }

  }

  /* ------------------------------------------------
     🍼 Feeding Routine
  ------------------------------------------------ */

  if (feeding) {

    if (feeding.avgIntervalMinutes) {

      const hours = Math.floor(feeding.avgIntervalMinutes / 60);
      const minutes = Math.round(feeding.avgIntervalMinutes % 60);

      insights.push({
        id: "routine-feeding-routine",
        category: "feeding",
        severity: "info",
        title: "Feeding Routine Detected",
        message:
          `Baby typically feeds every ${hours}h ${minutes}m.`,
        actionLabel: "View Feeding Analytics",
        actionUrl: "#feeding",
      });

    }

    if (feeding.nightFeedRatioPercent > 40) {

      insights.push({
        id: "routine-night-feeding-pattern",
        category: "feeding",
        severity: "info",
        title: "Frequent Night Feedings",
        message:
          "A large portion of feedings occur during nighttime.",
      });

    }

  }

  /* ------------------------------------------------
     🥛 Pumping Routine
  ------------------------------------------------ */

  if (pumping) {

    if (pumping.mostCommonHour !== null) {

      insights.push({
        id: "routine-pumping-routine",
        category: "pumping",
        severity: "info",
        title: "Pumping Routine Detected",
        message:
          `Most pumping sessions occur around ${pumping.mostCommonHour}:00.`,
        actionLabel: "View Pumping Analytics",
        actionUrl: "#pumping",
      });

    }

    if (pumping.totalSessions > 10) {

      insights.push({
        id: "routine-active-pumping-pattern",
        category: "pumping",
        severity: "success",
        title: "Active Pumping Routine",
        message:
          "Pumping sessions appear frequent and consistent.",
      });

    }

  }

  /* ------------------------------------------------
     💧 Diaper Pattern
  ------------------------------------------------ */

  if (diaper) {

    if (diaper.avgTotal >= 6) {

      insights.push({
        id: "routine-healthy-diaper-frequency",
        category: "diaper",
        severity: "success",
        title: "Healthy Diaper Frequency",
        message:
          "Diaper changes appear within healthy range.",
      });

    }

  }

  /* ------------------------------------------------
     🎮 Play Development
  ------------------------------------------------ */

  if (play) {

    if (play.totalMinutes > 30) {

      insights.push({
        id: "routine-healthy-play-activity",
        category: "play",
        severity: "success",
        title: "Healthy Play Activity",
        message:
          "Play activity supports healthy development.",
      });

    }

  }

  /* ------------------------------------------------
     🛁 Bath Routine
  ------------------------------------------------ */

  if (bath) {

    if (bath.weeklyFrequency >= 3) {

      insights.push({
        id: "routine-bath-routine",
        category: "bath",
        severity: "info",
        title: "Bath Routine Detected",
        message:
          "Bathing frequency appears consistent.",
      });

    }

  }

  /* ------------------------------------------------
     💊 Medicine Pattern
  ------------------------------------------------ */

  if (medicine) {

    if (medicine.avgIntervalMinutes) {

      insights.push({
        id: "routine-medicine-schedule",
        category: "medicine",
        severity: "info",
        title: "Medicine Schedule Pattern",
        message:
          "Medicine doses follow a regular schedule.",
        actionLabel: "View Medicine Analytics",
        actionUrl: "#medicine",
      });

    }

  }

  /* ------------------------------------------------
     🌡 Temperature Monitoring
  ------------------------------------------------ */

  if (temperature) {

    if (temperature.feverCount === 0) {

      insights.push({
        id: "routine-stable-temperature",
        category: "temperature",
        severity: "success",
        title: "Stable Temperature",
        message:
          "Temperature readings appear stable.",
      });

    }

  }

  /* ------------------------------------------------
     📏 Growth Monitoring
  ------------------------------------------------ */

  if (growth) {

    if (growth.totalWeightGain && growth.totalWeightGain > 0) {

      insights.push({
        id: "routine-growth-progress",
        category: "growth",
        severity: "success",
        title: "Healthy Growth Progress",
        message:
          "Weight gain indicates positive growth progress.",
      });

    }

  }

  return insights;
}
