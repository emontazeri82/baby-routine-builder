import { DashboardInsight } from "../types";
import { getPlayAnalytics } from "@/services/analytics/playSrevice";
import { getDateRange } from "../processorUtils";

export const PLAY_INSIGHT_KEYS = [
  "play-low-duration",
  "play-low-frequency",
  "play-low-variety",
  "play-low-outdoor",
  "play-low-motor",
  "play-low-cognitive",
  "play-fussy-mood",
  "play-low-consistency",
  "play-good-coverage",
];

type PlayAnalytics = {
  summary?: {
    totalSessions?: number;
    averageMinutes?: number;
    playVarietyScore?: number;
    outdoorPlayRatioPercent?: number;
    motorScore?: number;
    cognitiveScore?: number;
    consistencyScore?: number;
    uniquePlayTypes?: number;
    uniqueSkillsPracticed?: number;
  };
  distributions?: {
    mood?: Record<string, number>;
  };
};

export function generatePlayInsights(
  play: PlayAnalytics | null | undefined,
  days: number
): DashboardInsight[] {
  if (!play?.summary) return [];

  const insights: DashboardInsight[] = [];
  const summary = play.summary;
  const mood = play.distributions?.mood ?? {};

  if (typeof summary.averageMinutes === "number" && summary.averageMinutes < 10) {
    insights.push({
      id: "play-low-duration",
      category: "play",
      severity: "warning",
      title: "Short Play Sessions",
      message: "Play sessions are short. Try one longer guided play block today.",
    });
  }

  if (typeof summary.totalSessions === "number" && summary.totalSessions < days) {
    insights.push({
      id: "play-low-frequency",
      category: "play",
      severity: "info",
      title: "Low Play Frequency",
      message: "Play sessions are less frequent than expected this week.",
    });
  }

  if (typeof summary.playVarietyScore === "number" && summary.playVarietyScore < 40) {
    insights.push({
      id: "play-low-variety",
      category: "play",
      severity: "warning",
      title: "Low Play Variety",
      message: "Play variety is low. Introduce a new play activity this week.",
    });
  }

  if (
    typeof summary.outdoorPlayRatioPercent === "number" &&
    summary.outdoorPlayRatioPercent < 20
  ) {
    insights.push({
      id: "play-low-outdoor",
      category: "play",
      severity: "info",
      title: "Limited Outdoor Play",
      message: "Outdoor play is limited. Fresh-air play supports development.",
    });
  }

  if (typeof summary.motorScore === "number" && summary.motorScore < 40) {
    insights.push({
      id: "play-low-motor",
      category: "play",
      severity: "warning",
      title: "Low Motor Stimulation",
      message: "Motor skill stimulation is low. Try tummy time or movement play.",
    });
  }

  if (typeof summary.cognitiveScore === "number" && summary.cognitiveScore < 40) {
    insights.push({
      id: "play-low-cognitive",
      category: "play",
      severity: "info",
      title: "Low Cognitive Stimulation",
      message: "Cognitive stimulation is low this week. Add puzzle or sensory activities.",
    });
  }

  if ((mood.fussy ?? 0) > (mood.happy ?? 0)) {
    insights.push({
      id: "play-fussy-mood",
      category: "play",
      severity: "warning",
      title: "Fussy Play Mood",
      message: "Baby seems less comfortable during play. Shorter calm sessions may help.",
    });
  }

  if (typeof summary.consistencyScore === "number" && summary.consistencyScore < 60) {
    insights.push({
      id: "play-low-consistency",
      category: "play",
      severity: "info",
      title: "Inconsistent Play Routine",
      message: "Play schedule is inconsistent. Try anchoring play at the same time daily.",
    });
  }

  if (
    typeof summary.uniquePlayTypes === "number" &&
    typeof summary.uniqueSkillsPracticed === "number" &&
    summary.uniquePlayTypes >= 3 &&
    summary.uniqueSkillsPracticed >= 4
  ) {
    insights.push({
      id: "play-good-coverage",
      category: "play",
      severity: "success",
      title: "Strong Play Diversity",
      message: "Play variety and skill coverage look strong this week.",
    });
  }

  return insights;
}

export async function runPlayInsights(params: {
  babyId: string;
  activityId?: string | null;
  days?: number;
}) {
  const { babyId, activityId = null, days = 7 } = params;
  const { startDate, endDate } = getDateRange(days);
  const analytics = await getPlayAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return generatePlayInsights(analytics, days);
}
