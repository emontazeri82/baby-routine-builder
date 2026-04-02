// =========================
// 🔒 STRICT TYPES
// =========================

export type Severity = "strong" | "warning" | "info" | "success";

export type InsightType =
  | "critical"
  | "behavior"
  | "streak"
  | "predictive"
  | "global"
  | "summary";

export type Activity = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  activityName: string | null;
};

export type GlobalInsight = {
  id: string;
  type?: string;
  title: string;
  severity?: Severity;
};

type BaseInsight = {
  title: string;
  description?: string;
  severity?: Severity;
};

export type ScoredInsight = BaseInsight & {
  id: string;
  score: number;
  type?: InsightType;
  confidence?: number;
};

type NormalizedActivity = Activity & {
  start: Date;
};

// =========================
// 🎯 SCORE ENGINE
// =========================

function calculateScore({
  severity,
  extra = 0,
  recencyBoost = 0,
}: {
  severity: Severity;
  extra?: number;
  recencyBoost?: number;
}) {
  const baseMap: Record<Severity, number> = {
    strong: 100,
    warning: 70,
    info: 40,
    success: 20,
  };

  return baseMap[severity] + extra + recencyBoost;
}

// =========================
// ⚔️ CONFLICT RESOLUTION
// =========================

function resolveConflicts(insights: ScoredInsight[]) {
  const hasStrong = insights.some((i) => i.severity === "strong");

  if (hasStrong) {
    return insights.filter((i) => i.severity !== "success");
  }

  return insights;
}

// =========================
// 🔮 INTERVAL DETECTION
// =========================

function detectAverageInterval(normalized: NormalizedActivity[]) {
  if (normalized.length < 3) return null;

  const intervals: number[] = [];

  for (let i = 0; i < normalized.length - 1; i++) {
    const diff =
      (normalized[i].start.getTime() -
        normalized[i + 1].start.getTime()) /
      (1000 * 60);

    // Ignore impossible/noisy intervals to keep predictions meaningful.
    if (diff > 0 && diff <= 12 * 60) {
      intervals.push(diff);
    }
  }

  if (!intervals.length) return null;

  const recent = intervals.slice(0, 12);

  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function getRecentDayCounts(normalized: NormalizedActivity[], take = 3) {
  const byDay = new Map<string, number>();

  for (const a of normalized) {
    const dayKey = new Date(
      a.start.getFullYear(),
      a.start.getMonth(),
      a.start.getDate()
    ).getTime();
    const key = String(dayKey);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .slice(0, take)
    .map(([, count]) => count);
}

// =========================
// ⚖️ BALANCED SELECTION
// =========================

function balancedSelection(insights: ScoredInsight[]) {
  const priority = [
    "critical",
    "predictive",
    "behavior",
    "streak",
    "summary",
    "global",
  ];

  const grouped: Record<string, ScoredInsight[]> = {};

  insights.forEach((i) => {
    const key = i.type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(i);
  });

  const selected: ScoredInsight[] = [];

  priority.forEach((type) => {
    const group = grouped[type];
    if (!group) return;

    group.sort(
      (a, b) =>
        b.score * (b.confidence ?? 1) -
        a.score * (a.confidence ?? 1)
    );
    const take = type === "critical" ? 2 : 1;
    selected.push(...group.slice(0, take));
  });

  return selected.sort((a, b) => b.score - a.score).slice(0, 6);
}

// =========================
// 🧠 MAIN ENGINE
// =========================

export function generateActivityInsights({
  activities,
  globalInsights = [],
}: {
  activities: Activity[];
  globalInsights?: GlobalInsight[];
}): ScoredInsight[] {
  if (!activities.length) return [];

  const now = new Date();

  const normalized: NormalizedActivity[] = activities
    .filter((a) => a.startTime)
    .map((a) => ({
      ...a,
      start: new Date(a.startTime as Date),
    }))
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  if (!normalized.length) return [];


  const last = normalized[0];

  const minutesSinceLast = last
    ? (now.getTime() - last.start.getTime()) / (1000 * 60)
    : null;

  const todayKey = now.toDateString();

  const todayActivities = normalized.filter(
    (a) => a.start.toDateString() === todayKey
  );

  const result: ScoredInsight[] = [];

  // =========================
  // PUSH HELPER
  // =========================

  function pushInsight(
    insight: Omit<ScoredInsight, "id" | "score">,
    extraScore = 0,
    confidence = 1
  ) {
    let recencyBoost = 0;

    if (last) {
      const minutes = minutesSinceLast ?? 0;

      if (minutes < 60) recencyBoost = 15;
      else if (minutes < 180) recencyBoost = 5;
    }

    const severity: Severity = insight.severity ?? "info";
    const exists = result.some(
      (i) => i.type === insight.type && i.title === insight.title
    );

    if (exists) return;
    const freshness =
      minutesSinceLast !== null && minutesSinceLast > 180 ? 0.85 : 1;
    const baseScore = calculateScore({
      severity,
      extra: extraScore,
      recencyBoost,
    });

    result.push({
      ...insight,
      id: `${insight.type ?? "general"}-${insight.title}`,
      score: baseScore * freshness,
      severity,
      confidence,
    });
  }

  if (normalized.length < 3) {
    pushInsight(
      {
        type: "summary",
        title: "Not enough data yet",
        description: "Insights improve as more activities are logged",
        severity: "info",
      },
      5,
      0.3
    );
  }
  // =========================
  // ANALYTICS
  // =========================

  const dailyCounts: Record<string, number> = {};

  normalized.forEach((a) => {
    const key = a.start.toDateString();
    dailyCounts[key] = (dailyCounts[key] || 0) + 1;
  });

  const avgPerDay =
  Object.keys(dailyCounts).length > 0
    ? Object.values(dailyCounts).reduce((a, b) => a + b, 0) /
      Object.keys(dailyCounts).length
    : 0;

  let avgGap = 0;

  if (normalized.length > 1) {
    const gaps = [];

    for (let i = 0; i < normalized.length - 1; i++) {
      const diff =
        (normalized[i].start.getTime() -
          normalized[i + 1].start.getTime()) /
        (1000 * 60);

      gaps.push(diff);
    }

    avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }

  // =========================
  // 🔮 INTERVAL PREDICTION
  // =========================

  const avgInterval = detectAverageInterval(normalized);

  if (
    avgInterval &&
    minutesSinceLast != null &&
    minutesSinceLast > avgInterval * 0.9 &&
    minutesSinceLast < avgInterval * 1.8
  ) {
    pushInsight(
      {
        type: "predictive",
        title: "Next activity expected soon",
        description: `Usually every ${Math.round(avgInterval)} min`,
        severity: "info",
      },
      35,
      0.85
    );
  }

  if (
    avgInterval &&
    minutesSinceLast &&
    minutesSinceLast > avgInterval * 1.3
  ) {
    pushInsight(
      {
        type: "critical",
        title: "Expected activity missing",
        description: "You usually log by now",
        severity: "warning",
      },
      35,
      0.9
    );
  }
  const hourCounts: Record<number, number> = {};

  normalized.forEach((a) => {
    const h = a.start.getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (peakHour) {
    const [hour, count] = peakHour.map(Number);

    if (
      count >= 3 &&
      Math.abs(now.getHours() - hour) <= 1 &&
      todayActivities.length === 0
    ) {
      pushInsight(
        {
          type: "predictive",
          title: "Routine activity expected now",
          description: `Usually around ${hour}:00`,
          severity: "info",
        },
        25,
        0.8
      );
    }
  }
  // =========================
  // 🔴 CRITICAL (RESTORED + IMPROVED)
  // =========================

  if (todayActivities.length === 0) {
    pushInsight(
      {
        type: "critical",
        title: "No activity logged today",
        description: "Start tracking to maintain routine",
        severity: "strong",
      },
      40
    );
  }

  if (minutesSinceLast && avgGap) {
    if (minutesSinceLast > avgGap * 2) {
      pushInsight(
        {
          type: "critical",
          title: "Very unusual activity gap",
          description: "Far longer than your normal rhythm",
          severity: "strong",
        },
        30
      );
    } else if (minutesSinceLast > avgGap * 1.5) {
      pushInsight(
        {
          type: "critical",
          title: "Unusual activity gap",
          description: "Longer than your normal pattern",
          severity: "warning",
        },
        20
      );
    }
  }

  // =========================
  // 🟡 BEHAVIOR (RESTORED)
  // =========================

  if (todayActivities.length > 0 && avgPerDay > 0) {
    const behaviorScore = todayActivities.length / avgPerDay;

    if (behaviorScore < 0.5) {
      pushInsight(
        {
          type: "behavior",
          title: "Lower activity than usual",
          description: `Today: ${todayActivities.length} vs avg ${Math.round(avgPerDay)}`,
          severity: "warning",
        },
        15,
        0.8
      );
    }

    if (behaviorScore > 1.3) {
      pushInsight(
        {
          type: "behavior",
          title: "Very active day",
          description: "Higher than your normal pattern",
          severity: "success",
        },
        20,
        0.8
      );
    } else if (behaviorScore >= 1) {
      pushInsight(
        {
          type: "behavior",
          title: "Great consistency today",
          description: "You're matching your routine 👏",
          severity: "success",
        },
        10,
        0.7
      );
    }

    if (behaviorScore < 0.3) {
      pushInsight(
        {
          type: "behavior",
          title: "Very low activity today",
          description: "Much lower than usual",
          severity: "warning",
        },
        25,
        0.9
      );
    }
  }

  // =========================
  // 🔁 STREAK (RESTORED)
  // =========================

  const normalizedByDay = new Map<string, number>();

  normalized.forEach((a) => {
    const key = a.start.toDateString();
    normalizedByDay.set(key, (normalizedByDay.get(key) || 0) + 1);
  });

  let streak = 0;
  let currentDay = new Date();

  for (let i = 0; i < 7; i++) {
    if (normalizedByDay.has(currentDay.toDateString())) {
      streak++;
      currentDay.setDate(currentDay.getDate() - 1);
    } else break;
  }

  if (streak >= 5) {
    pushInsight(
      {
        type: "streak",
        title: `${streak}-day streak`,
        description: "Excellent consistency 🔥",
        severity: "success",
      },
      25,
      0.9
    );
  }

  // =========================
  // 📈 TREND (RESTORED)
  // =========================

  const last3Days = getRecentDayCounts(normalized, 3);

  const trendRatio =
    last3Days.length >= 2
      ? last3Days[0] / (last3Days[last3Days.length - 1] || 1)
      : 1;

  if (trendRatio > 1.5) {
    pushInsight(
      {
        type: "behavior",
        title: "Activity increasing",
        description: "Clear upward trend",
        severity: "info",
      },
      10,
      0.7
    );
  }

  // =========================
  // 🌐 GLOBAL (RESTORED)
  // =========================

  globalInsights.forEach((g) => {
    pushInsight(
      {
        type: "global",
        title: g.title,
        severity: g.severity ?? "info",
      },
      50,
      1
    );
  });

  // =========================
  // 🧠 LAST ACTIVITY (RESTORED)
  // =========================

  if (last?.activityName) {
    pushInsight(
      {
        type: "summary",
        title: "Last activity",
        description: last.activityName,
        severity: "info",
      },
      5,
      1
    );
  }
  // =========================
  // 🧹 CLEAN
  // =========================

  const unique = new Map<string, ScoredInsight>();

  result.forEach((i) => unique.set(i.id, i));

  const cleaned = resolveConflicts(Array.from(unique.values()));

  return balancedSelection(cleaned);
}
