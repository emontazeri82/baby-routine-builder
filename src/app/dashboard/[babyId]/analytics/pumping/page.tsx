"use client";

import { useParams } from "next/navigation";
import { usePumpingAnalytics } from "@/hooks/usePumpingAnalytics";

export default function PumpingAnalyticsPage() {
  const params = useParams();
  const babyId = params.babyId as string;

  const { data, loading, error } = usePumpingAnalytics({
    babyId,
    days: 30,
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-muted-foreground">Loading pumping analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Failed to load pumping analytics: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-muted-foreground">
        No pumping data available
      </div>
    );
  }

  const { summary, distributions, daily } = data;

  return (
    <div className="p-6 space-y-8">

      {/* ---------------- Header ---------------- */}

      <div>
        <h1 className="text-2xl font-semibold">
          Pumping Analytics
        </h1>
        <p className="text-muted-foreground text-sm">
          Milk production insights and pumping patterns
        </p>
      </div>

      {/* ---------------- Summary Cards ---------------- */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <Card
          title="Total Sessions"
          value={summary.totalSessions}
        />

        <Card
          title="Total Milk"
          value={`${summary.totalAmountMl} ml`}
        />

        <Card
          title="Avg Per Pump"
          value={`${summary.avgAmountPerSessionMl} ml`}
        />

        <Card
          title="Avg Duration"
          value={`${summary.avgDurationMinutes} min`}
        />

        <Card
          title="Pain Ratio"
          value={`${summary.painRatioPercent}%`}
        />

        <Card
          title="Most Used Side"
          value={summary.mostCommonSide ?? "—"}
        />

        <Card
          title="Peak Pump Hour"
          value={
            summary.mostCommonHour !== null
              ? `${summary.mostCommonHour}:00`
              : "—"
          }
        />

      </div>

      {/* ---------------- Distribution Section ---------------- */}

      <div className="grid md:grid-cols-2 gap-8">

        {/* Side Distribution */}

        <DistributionCard
          title="Pumping Side Distribution"
          data={distributions.side}
        />

        {/* Hour Distribution */}

        <DistributionCard
          title="Pumping Time Distribution"
          data={distributions.hourOfDay}
        />

      </div>

      {/* ---------------- Daily Chart ---------------- */}

      <div className="space-y-4">

        <h2 className="text-lg font-medium">
          Daily Milk Production
        </h2>

        <div className="border rounded-lg p-4">

          {daily.length === 0 && (
            <p className="text-muted-foreground">
              No pumping sessions recorded
            </p>
          )}

          {daily.map((d) => (
            <div
              key={d.date}
              className="flex justify-between text-sm py-1"
            >
              <span>{d.date}</span>

              <span className="text-muted-foreground">
                {d.sessions} sessions
              </span>

              <span className="font-medium">
                {d.totalAmount} ml
              </span>
            </div>
          ))}

        </div>
      </div>

    </div>
  );
}

/* ---------------- UI Components ---------------- */

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>
      <p className="text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function DistributionCard({
  title,
  data,
}: {
  title: string;
  data: Record<string | number, number>;
}) {
  const entries = Object.entries(data);

  return (
    <div className="border rounded-lg p-4 space-y-3">

      <h3 className="font-medium">{title}</h3>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No data
        </p>
      )}

      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex justify-between text-sm"
        >
          <span>{key}</span>
          <span>{value}</span>
        </div>
      ))}

    </div>
  );
}