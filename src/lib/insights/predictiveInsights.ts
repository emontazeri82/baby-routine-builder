import { DashboardInsight } from "./types";

type PredictiveInput = {
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
  remindersCount?: number;
};

export function generatePredictiveInsights(
  data: PredictiveInput
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
     😴 Sleep → Nap Intelligence
  ------------------------------------------------ */

  if (sleep && nap) {

    if (sleep.totalNightSleepMinutes < 480) {
      insights.push({
        id: "predictive-nap-needed-after-poor-sleep",
        category: "nap",
        severity: "warning",
        title: "Early Nap Recommended",
        message:
          "Night sleep was shorter than usual. Baby may benefit from an earlier nap today.",
        actionLabel: "View Nap Analytics",
        actionUrl: "#nap",
      });
    }

    if (sleep.totalNightSleepMinutes >= 480 && nap.avgNapsPerDay >= 2) {
      insights.push({
        id: "predictive-balanced-sleep-pattern",
        category: "sleep",
        severity: "success",
        title: "Healthy Sleep Balance",
        message:
          "Night sleep and daytime naps appear well balanced.",
      });
    }

    if (sleep.totalNightSleepMinutes < 360) {
      insights.push({
        id: "predictive-sleep-debt-warning",
        category: "sleep",
        severity: "critical",
        title: "Sleep Debt Detected",
        message:
          "Baby may be experiencing sleep debt from short night sleep.",
        actionLabel: "View Sleep Analytics",
        actionUrl: "#sleep",
      });
    }

  }

  /* ------------------------------------------------
     🍼 Feeding Predictions
  ------------------------------------------------ */

  if (feeding) {

    if (feeding.avgIntervalMinutes && feeding.avgIntervalMinutes > 180) {
      insights.push({
        id: "predictive-feeding-likely-soon",
        category: "feeding",
        severity: "info",
        title: "Feeding Likely Soon",
        message:
          "Recent feeding intervals suggest baby may be ready to feed soon.",
        actionLabel: "View Feeding Analytics",
        actionUrl: "#feeding",
      });
    }

    if (feeding.clusterFeeds && feeding.clusterFeeds >= 3) {
      insights.push({
        id: "predictive-growth-spurt-suspected",
        category: "feeding",
        severity: "info",
        title: "Possible Growth Spurt",
        message:
          "Frequent feedings may indicate a temporary growth spurt.",
      });
    }

    if (feeding.avgIntervalMinutes && feeding.avgIntervalMinutes < 60) {
      insights.push({
        id: "predictive-cluster-feeding-pattern",
        category: "feeding",
        severity: "info",
        title: "Cluster Feeding Pattern",
        message:
          "Short feeding intervals suggest cluster feeding behavior.",
      });
    }

  }

  /* ------------------------------------------------
     💧 Hydration Monitoring
  ------------------------------------------------ */

  if (diaper) {

    if (diaper.avgWet !== undefined && diaper.avgWet < 3) {
      insights.push({
        id: "predictive-low-hydration",
        category: "diaper",
        severity: "warning",
        title: "Low Hydration Signals",
        message:
          "Wet diaper frequency appears lower than typical.",
        actionLabel: "View Diaper Trends",
        actionUrl: "#diaper",
      });
    }

    if (diaper.avgWet >= 5) {
      insights.push({
        id: "predictive-healthy-hydration",
        category: "diaper",
        severity: "success",
        title: "Healthy Hydration Pattern",
        message:
          "Wet diaper frequency suggests good hydration.",
      });
    }

  }

  /* ------------------------------------------------
     🌡 Temperature Monitoring
  ------------------------------------------------ */

  if (temperature) {

    if (temperature.avgTemperature > 38) {
      insights.push({
        id: "predictive-fever-alert",
        category: "temperature",
        severity: "critical",
        title: "Possible Fever",
        message:
          "Elevated temperature readings detected. Monitor for illness symptoms.",
        actionLabel: "View Temperature Logs",
        actionUrl: "#temperature",
      });
    }

    if (temperature.avgTemperature > 37.5 && temperature.avgTemperature <= 38) {
      insights.push({
        id: "predictive-temperature-watch",
        category: "temperature",
        severity: "warning",
        title: "Temperature Slightly Elevated",
        message:
          "Temperature readings are slightly elevated.",
      });
    }

  }

  /* ------------------------------------------------
     🥛 Pumping Monitoring
  ------------------------------------------------ */

  if (pumping) {

    if (pumping.avgAmountPerSessionMl < 30) {
      insights.push({
        id: "predictive-low-pumping-output",
        category: "pumping",
        severity: "warning",
        title: "Low Pumping Output",
        message:
          "Average milk output per pumping session appears lower than typical.",
        actionLabel: "View Pumping Analytics",
        actionUrl: "#pumping",
      });
    }

    if (pumping.painRatioPercent > 30) {
      insights.push({
        id: "predictive-pumping-discomfort",
        category: "pumping",
        severity: "warning",
        title: "Pumping Discomfort Detected",
        message:
          "Frequent discomfort during pumping sessions detected.",
      });
    }

    if (pumping.totalSessions === 0) {
      insights.push({
        id: "predictive-no-pumping-recorded",
        category: "pumping",
        severity: "info",
        title: "No Pumping Recorded",
        message:
          "No pumping sessions have been logged recently.",
      });
    }

  }

  /* ------------------------------------------------
     🎮 Play Activity
  ------------------------------------------------ */

  if (play) {

    if (play.totalSessions < 1) {
      insights.push({
        id: "predictive-low-play-activity",
        category: "play",
        severity: "info",
        title: "Low Play Activity",
        message:
          "Limited play activity detected recently. Interactive play supports development.",
        actionLabel: "View Play Analytics",
        actionUrl: "#play",
      });
    }

  }

  /* ------------------------------------------------
     🛁 Bath Routine
  ------------------------------------------------ */

  if (bath) {

    if (bath.daysSinceLastBath && bath.daysSinceLastBath > 3) {
      insights.push({
        id: "predictive-bath-due",
        category: "bath",
        severity: "info",
        title: "Bath May Be Due",
        message:
          "It has been several days since the last bath.",
      });
    }

  }

  /* ------------------------------------------------
     💊 Medicine Monitoring
  ------------------------------------------------ */

  if (medicine) {

    if (medicine.missedDoses > 0) {
      insights.push({
        id: "predictive-missed-medicine",
        category: "medicine",
        severity: "warning",
        title: "Missed Medicine Doses",
        message:
          "Some medicine doses appear to have been missed.",
        actionLabel: "Review Medicine Schedule",
        actionUrl: "#medicine",
      });
    }

  }

  /* ------------------------------------------------
     📏 Growth Monitoring
  ------------------------------------------------ */

  if (growth) {

    if (growth.weightTrend === "slow") {
      insights.push({
        id: "predictive-slow-growth",
        category: "growth",
        severity: "warning",
        title: "Growth Trend Monitoring",
        message:
          "Weight gain appears slower than expected.",
      });
    }

  }

  return insights;
}
