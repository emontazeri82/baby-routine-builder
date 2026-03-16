"use client";

import { useParams, useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RangePresetSelector from "@/components/dashboard/RangePresetSelector";
import { usePlayAnalytics } from "@/hooks/usePlayAnalytics";

function formatHourLabel(value: string | number | null) {
  if (!value) return "n/a";
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "n/a";
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${period}`;
}

function DistributionList({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((acc, [, count]) => acc + count, 0);

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {sorted.length === 0 && (
          <p className="text-sm text-neutral-500">No data yet.</p>
        )}
        {sorted.map(([key, count]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize text-neutral-700">
                {key.replace(/_/g, " ")}
              </span>
              <span className="font-medium">
                {count} ({total ? Math.round((count / total) * 100) : 0}%)
              </span>
            </div>
            <div className="h-1.5 rounded bg-neutral-100">
              <div
                className="h-1.5 rounded bg-neutral-700"
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PlayAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const babyId = params.babyId as string;

  const rawDays = Number(searchParams.get("days"));
  const allowedDays = new Set([7, 14, 30, 60]);
  const days = allowedDays.has(rawDays) ? rawDays : 7;

  const { data, loading, error } = usePlayAnalytics({
    babyId,
    days,
  });

  if (loading) return <div className="p-6">Loading play analytics...</div>;
  if (error || !data) return <div className="p-6 text-red-500">Failed to load play analytics.</div>;

  const summary = data.summary;
  const distributions = data.distributions;
  const daily = data.daily;
  const maxDailyMinutes = Math.max(...daily.map((d) => d.totalMinutes), 1);
  const insights: string[] = [];

  if (summary.averageMinutes < 10) {
    insights.push("Play sessions are short. Consider one longer guided play block daily.");
  }
  if (summary.consistencyScore < 60) {
    insights.push("Play consistency is low. Try anchoring play around the same hours each day.");
  }
  if (summary.playVarietyScore < 35) {
    insights.push("Low play variety. Introduce one new play type or skill focus this week.");
  }
  if ((distributions.mood.fussy ?? 0) > (distributions.mood.happy ?? 0)) {
    insights.push("Fussy play mood is higher than happy mood. Consider shorter and calmer sessions.");
  }
  if (summary.outdoorPlayRatioPercent < 20) {
    insights.push("Outdoor play is limited. Try adding one outdoor session when feasible.");
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Play Analytics</h1>
        <p className="text-neutral-500">Last {days} days overview</p>
      </div>

      <RangePresetSelector />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Sessions</p>
            <p className="text-2xl font-bold">{summary.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Minutes</p>
            <p className="text-2xl font-bold">{summary.totalMinutes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Session</p>
            <p className="text-2xl font-bold">{summary.averageMinutes} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Top Play Type</p>
            <p className="text-2xl font-bold capitalize">
              {(summary.mostCommonPlayType ?? "n/a").replace(/_/g, " ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Most Active Hour</p>
            <p className="text-2xl font-bold">
              {formatHourLabel(summary.mostActiveHour)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Longest Session</p>
            <p className="text-2xl font-bold">{summary.longestSessionMinutes} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Shortest Session</p>
            <p className="text-2xl font-bold">{summary.shortestSessionMinutes} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Unique Play Types</p>
            <p className="text-2xl font-bold">{summary.uniquePlayTypes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Unique Skills</p>
            <p className="text-2xl font-bold">{summary.uniqueSkillsPracticed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Engagement Score</p>
            <p className="text-2xl font-bold">{summary.engagementScore} / 100</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Consistency Score</p>
            <p className="text-2xl font-bold">{summary.consistencyScore} / 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Variety Score</p>
            <p className="text-2xl font-bold">{summary.playVarietyScore} / 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Sessions / Active Day</p>
            <p className="text-2xl font-bold">{summary.averageSessionsPerActiveDay}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avg Skills / Session</p>
            <p className="text-2xl font-bold">{summary.averageSkillsPerSession}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Outdoor Ratio</p>
            <p className="text-2xl font-bold">{summary.outdoorPlayRatioPercent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Active Play Ratio</p>
            <p className="text-2xl font-bold">{summary.activePlayRatioPercent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Happy Mood Ratio</p>
            <p className="text-2xl font-bold">{summary.happyPlayRatioPercent}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Motor Score</p>
            <p className="text-2xl font-bold">{summary.motorScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Cognitive Score</p>
            <p className="text-2xl font-bold">{summary.cognitiveScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Social Score</p>
            <p className="text-2xl font-bold">{summary.socialScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Language Score</p>
            <p className="text-2xl font-bold">{summary.languageScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sensory Score</p>
            <p className="text-2xl font-bold">{summary.sensoryScore}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Play Insights</h2>
          {insights.length === 0 && (
            <p className="text-sm text-neutral-500">Play pattern looks balanced.</p>
          )}
          {insights.map((insight) => (
            <p key={insight} className="text-sm text-neutral-700">
              {insight}
            </p>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">Top Skill: {(summary.topSkill ?? "n/a").replace(/_/g, " ")}</Badge>
            <Badge variant="outline">Top Location: {(summary.mostCommonLocation ?? "n/a").replace(/_/g, " ")}</Badge>
            <Badge variant="outline">Active Days: {summary.activeDays}</Badge>
            <Badge variant="outline">Best Day: {summary.bestPlayDay ?? "n/a"}</Badge>
            <Badge variant="outline">Lowest Day: {summary.worstPlayDay ?? "n/a"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-semibold">Daily Play Time Trend</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Bars show total minutes played each day in the selected range.
          </p>
          {daily.length === 0 ? (
            <p className="text-sm text-neutral-500">No daily play data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-48 min-w-[520px]">
                {daily.map((d, index) => {
                  const labelStep = Math.max(1, Math.ceil(daily.length / 8));
                  const showLabel = index % labelStep === 0 || index === daily.length - 1;
                  const heightPercent = (d.totalMinutes / maxDailyMinutes) * 100;
                  return (
                    <div key={d.date} className="flex flex-col items-center min-w-8 flex-1">
                      <div
                        className="w-full bg-violet-500 rounded-t-md min-h-[4px]"
                        style={{
                          height: heightPercent === 0 ? "4px" : `${heightPercent}%`,
                        }}
                        title={`${d.totalMinutes} min, ${d.sessions} sessions`}
                      />
                      <p className="text-xs mt-1 text-neutral-500 h-4">
                        {showLabel ? d.date.slice(5) : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionList title="Play Type" values={distributions.playType} />
        <DistributionList title="Location" values={distributions.location} />
        <DistributionList title="Mood" values={distributions.mood} />
        <DistributionList title="Intensity" values={distributions.intensity} />
        <DistributionList title="Skills" values={distributions.skills} />
        <DistributionList
          title="Hour Of Day"
          values={Object.fromEntries(
            Object.entries(distributions.hourOfDay).map(([key, value]) => [
              formatHourLabel(key),
              value,
            ])
          )}
        />
      </div>
    </div>
  );
}
