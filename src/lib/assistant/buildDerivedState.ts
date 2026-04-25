import ActivityConfig from "@/lib/assistant/config/activityConfig";
import { ActivityTimeRules } from "@/lib/types/activityTypes";

export type ActivityLike = {
  id: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  activityName?: string | null;
  /** Present when loaded from DB — needed for insight processors (temp, growth, pumping). */
  metadata?: Record<string, unknown> | null;
};

export type ReminderLike = Record<string, unknown>;

export type AssistantDerivedState = {
  now: Date;
  activities: ActivityLike[];
  todayActivities: ActivityLike[];
  lastActivity?: ActivityLike;
  openActivities: ActivityLike[];

  // 🔥 NEW GENERIC STRUCTURE (SCALABLE)
  activitiesByType: Record<string, ActivityLike[]>;
  lastByType: Record<string, ActivityLike | undefined>;
  minutesSinceByType: Record<string, number | null>;
  todayCountByType: Record<string, number>;
  openByType: Record<string, ActivityLike[]>;

  // 🍼 Feeding intelligence (kept for compatibility)
  minutesSinceLastFeeding: number | null;
  avgFeedingInterval: number | null;
  feedingIntervals: number[];
  avgFeeding3to5: number | null;
  avgFeeding7: number | null;
  feedingConfidence: "low" | "medium" | "high";

  // 😴 Sleep intelligence
  minutesSinceLastSleep: number | null;

  // 🧠 Additional rule inputs
  nowMinutes: number;
  awakeMinutes: number | null;
  expectedWakeWindow: number;
  routines: any[];
  patternDeviationScore: number;
  consistencyScore: number;
  loggingDelayScore: number;
  shortNapCount: number;

  reminders: ReminderLike[];
};

export const buildDerivedState = (params: {
  activities: ActivityLike[];
  reminders: ReminderLike[];
}): AssistantDerivedState => {
  const now = new Date();
  const nowTime = now.getTime();

  const MAX_OPEN_MINUTES = 12 * 60;

  const isExpired = (startTime?: string | Date | null) => {
    if (!startTime) return false;
    const time = new Date(startTime).getTime();
    if (isNaN(time)) return false;
    return (nowTime - time) / 60000 > MAX_OPEN_MINUTES;
  };
  const activities = Array.isArray(params.activities) ? params.activities : [];
  // 🧠 Limit to last 7 days (GLOBAL FILTER FOR ASSISTANT)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const recentActivities = activities
    .map((a) => {
      if (!a.endTime && isExpired(a.startTime)) {
        return {
          ...a,
          endTime: new Date(
            new Date(a.startTime!).getTime() + MAX_OPEN_MINUTES * 60000
          ),
          autoEnded: true, // 👈 optional but VERY useful
        };
      }
      return a;
    })
    .filter((a) => {
      const time = a.startTime ?? a.endTime;
      if (!time) return false;

      const date = new Date(time);
      return date >= sevenDaysAgo && date <= now;
    });

  if (process.env.NODE_ENV === "development") {
    console.log("[Assistant] All activities:", activities.length);
    console.log("[Assistant] 7-day activities:", recentActivities.length);
    console.log(
      "[Assistant] 7-day activity dates:",
      recentActivities.map((activity) => ({
        id: activity.id,
        activityName: activity.activityName,
        startTime: activity.startTime,
        endTime: activity.endTime,
      }))
    );
  }

  const getTime = (date?: string | Date | null) => {
    if (!date) return NaN;
    return new Date(date).getTime();
  };

  // 🧱 Sort activities (newest first)
  const sorted = [...recentActivities].sort(
    (a, b) => getTime(b.startTime) - getTime(a.startTime)
  );

  const todayKey = now.toDateString();

  // 📅 Today's activities
  const todayActivities = sorted.filter(
    (activity) =>
      activity.startTime &&
      new Date(activity.startTime).toDateString() === todayKey
  );

  // ⏱ Helper: minutes since
  const minutesSince = (date?: string | Date | null) => {
    if (!date) return null;
    const time = getTime(date);
    if (isNaN(time)) return null;
    return (nowTime - time) / 60000;
  };

  // 📆 Helper: days ago
  const daysAgo = (date?: string | Date | null) => {
    if (!date) return Infinity;
    const time = getTime(date);
    if (isNaN(time)) return Infinity;
    const diff = nowTime - time;
    return diff / (1000 * 60 * 60 * 24);
  };

  const getClockMinutes = (date?: string | Date | null) => {
    const time = getTime(date);
    if (isNaN(time)) return null;
    const value = new Date(time);
    return value.getHours() * 60 + value.getMinutes();
  };

  const getReferenceTime = (activity?: ActivityLike) => {
    if (!activity?.activityName) return null;

    const rule = ActivityTimeRules[activity.activityName];
    const reference = rule?.requiresEndTime
      ? activity.endTime ?? null
      : activity.startTime ?? null;

    return reference;
  };

  const averageClockMinutes = (values: number[]) => {
    if (!values.length) return null;

    const { x, y } = values.reduce(
      (acc, minutes) => {
        const angle = (minutes / 1440) * Math.PI * 2;
        acc.x += Math.cos(angle);
        acc.y += Math.sin(angle);
        return acc;
      },
      { x: 0, y: 0 }
    );

    const angle = Math.atan2(y / values.length, x / values.length);
    const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
    return (normalized / (Math.PI * 2)) * 1440;
  };

  // =====================================================
  // 🔥 GENERIC ACTIVITY LAYER (STEP 1 CORE)
  // =====================================================

  const activitiesByType = sorted.reduce((acc, act) => {
    if (!act.activityName || !act.startTime) return acc;

    if (!acc[act.activityName]) {
      acc[act.activityName] = [];
    }

    acc[act.activityName].push(act);
    return acc;
  }, {} as Record<string, ActivityLike[]>);

  const lastByType = Object.fromEntries(
    Object.entries(activitiesByType).map(([type, acts]) => [
      type,
      acts[0],
    ])
  );

  const minutesSinceByType = Object.fromEntries(
    Object.entries(lastByType).map(([type, act]) => [
      type,
      minutesSince(getReferenceTime(act)),
    ])
  );

  const configuredLabels = Object.values(ActivityConfig).map(
    (config) => config.label
  );

  const todayCountByType = configuredLabels.reduce(
    (acc, label) => {
      const acts = activitiesByType[label] ?? [];
      acc[label] = acts.filter(
        (a) =>
          a.startTime &&
          new Date(a.startTime).toDateString() === todayKey
      ).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const openByType = Object.fromEntries(
    Object.entries(activitiesByType).map(([type, acts]) => [
      type,
      acts.filter((activity) => {
        const rule = ActivityTimeRules[type];
        return rule?.requiresEndTime && !activity.endTime;
      }),
    ])
  );

  // =====================================================
  // 🍼 FEEDING LOGIC (UNCHANGED – SAFE)
  // =====================================================

  const activities3to5Days = sorted.filter((a) => {
    const d = daysAgo(a.startTime);
    return d >= 0 && d <= 5;
  });

  const activities7Days = sorted.filter((a) => {
    const d = daysAgo(a.startTime);
    return d >= 0 && d <= 7;
  });

  const getFeedingIntervals = (activities: ActivityLike[]) => {
    const feeds = activities.filter(
      (a) => a.activityName === "Feeding" && a.startTime
    );

    const intervals: number[] = [];

    for (let i = 1; i < feeds.length; i++) {
      const prev = feeds[i - 1]?.startTime;
      const curr = feeds[i]?.startTime;
      if (!prev || !curr) continue;

      const prevTime = getTime(prev);
      const currTime = getTime(curr);
      if (isNaN(prevTime) || isNaN(currTime)) continue;

      const diff = (prevTime - currTime) / 60000;

      if (!isNaN(diff) && diff > 0) {
        intervals.push(diff);
      }
    }

    return intervals;
  };

  const feedingIntervals = getFeedingIntervals(sorted);
  const feeding3to5 = getFeedingIntervals(activities3to5Days);
  const feeding7 = getFeedingIntervals(activities7Days);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const avgFeeding3to5 = avg(feeding3to5);
  const avgFeeding7 = avg(feeding7);

  let avgFeedingInterval: number | null = null;
  let feedingConfidence: "low" | "medium" | "high" = "low";

  if (feeding3to5.length >= 3) {
    avgFeedingInterval = avgFeeding3to5;
    feedingConfidence = "medium";
  }

  if (feeding7.length >= 5) {
    avgFeedingInterval = avgFeeding7;
    feedingConfidence = "high";
  }

  const lastFeeding = lastByType["Feeding"] ?? null;
  const minutesSinceLastFeeding =
    lastFeeding?.startTime ? minutesSince(lastFeeding.startTime) : null;

  // =====================================================
  // 😴 SLEEP LOGIC
  // =====================================================

  const sleepActivities = sorted.filter(
    (activity) =>
      activity.activityName === "Sleep" || activity.activityName === "Nap"
  );

  const lastSleep = sleepActivities[0] ?? null;

  const lastCompletedSleep = sleepActivities.reduce<ActivityLike | null>(
    (latest, activity) => {
      if (!activity.endTime) return latest;

      const endTime = getTime(activity.endTime);
      if (isNaN(endTime)) return latest;

      if (!latest) return activity;

      const latestEndTime = getTime(latest.endTime);
      if (isNaN(latestEndTime) || endTime > latestEndTime) {
        return activity;
      }

      return latest;
    },
    null
  );
  // =====================================================
  // 🔥 MISSING DERIVED FIELDS (CRITICAL FIX)
  // =====================================================

  // 🧠 Current time in minutes (for pattern engine)
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 😴 Awake time (used in predictive.ts)
  const awakeMinutes = minutesSince(lastCompletedSleep?.endTime);

  // 🧠 Wake window (temporary default — can improve later)
  const expectedWakeWindow = 120;

  // 🧠 Pattern system (currently disabled but REQUIRED)
  // =====================================================
  // 🔁 ROUTINES (PATTERN ENGINE - REAL DATA)
  // =====================================================

  const routines = Object.entries(activitiesByType)
    .map(([type, acts]) => {
      const recent = acts.slice(0, 3);

      if (!recent.length) return null;

      const clockMinutes = recent
        .map((activity) => getClockMinutes(activity.startTime))
        .filter((value): value is number => value !== null);

      const avgMinutes = averageClockMinutes(clockMinutes);
      if (avgMinutes === null) return null;

      const hours = Math.floor(avgMinutes / 60);
      const minutes = Math.floor(avgMinutes % 60);

      return {
        type,
        time: avgMinutes,
        timeFormatted: new Date(
          0,
          0,
          0,
          hours,
          minutes
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const patternDeviationScore = 0;

  // 🧠 Behavior system (placeholders to activate rules)
  const consistencyScore = 0;
  const loggingDelayScore = 0;
  const shortNapCount = 0;
  // =====================================================
  // 🚨 OPEN ACTIVITIES (GLOBAL)
  // =====================================================

  const openActivities = sorted.filter((activity) => {
    if (!activity.activityName) return false;

    const rule = ActivityTimeRules[activity.activityName];
    return rule?.requiresEndTime && !activity.endTime;
  });

  // =====================================================
  // 🚀 FINAL STATE
  // =====================================================
  return {
    now,
    activities: sorted,
    todayActivities,
    lastActivity: sorted.length ? sorted[0] : undefined,
    openActivities,

    // 🔥 NEW GENERIC
    activitiesByType,
    lastByType,
    minutesSinceByType,
    todayCountByType,
    openByType,

    // 🍼 Feeding (legacy support)
    minutesSinceLastFeeding,
    avgFeedingInterval,
    feedingIntervals,
    avgFeeding3to5,
    avgFeeding7,
    feedingConfidence,

    // 😴 Sleep
    minutesSinceLastSleep: minutesSince(lastCompletedSleep?.endTime),

    reminders: params.reminders ?? [],
    // 🧠 NEW FIELDS (REQUIRED FOR RULES)
    nowMinutes,
    awakeMinutes,
    expectedWakeWindow,

    routines,
    patternDeviationScore,

    consistencyScore,
    loggingDelayScore,
    shortNapCount,
  };
};

export default buildDerivedState;