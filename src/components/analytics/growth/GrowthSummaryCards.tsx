
"use client";

interface Summary {
  latestWeight: number | null;
  latestHeight: number | null;
  latestHead: number | null;
  totalWeightGain: number | null;
  avgWeeklyGain: number | null;
  heightGrowthPerMonth: number | null;
  headGrowthPerMonth: number | null;
  daysSinceLastMeasurement: number | null;
  trend: string | null;
}

interface Props {
  summary: Summary | null;
}

export default function GrowthSummaryCards({ summary }: Props) {
  if (!summary) return null;
  function formatKg(value: number | null) {
    return value !== null ? `${value.toFixed(2)} kg` : "—";
  }

  function formatGrams(value: number | null) {
    return value !== null ? `${(value * 1000).toFixed(0)} g` : "—";
  }

  function formatCm(value: number | null) {
    return value !== null ? `${value.toFixed(2)} cm` : "—";
  }

  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
      <Card
        title="Latest Weight"
        value={formatKg(summary.latestWeight)}
      />

      <Card
        title="Total Gain"
        value={formatKg(summary.totalWeightGain)}
      />

      <Card
        title="Avg Weekly Gain"
        value={formatGrams(summary.avgWeeklyGain)}
      />

      <Card
        title="Height / Month"
        value={formatCm(summary.heightGrowthPerMonth)}
      />

      <Card
        title="Head / Month"
        value={formatCm(summary.headGrowthPerMonth)}
      />

      <Card
        title="Last Measured"
        value={
          summary.daysSinceLastMeasurement !== null
            ? `${summary.daysSinceLastMeasurement} days ago`
            : "—"
        }
      />

      <Card
        title="Trend"
        value={summary.trend ?? "—"}
      />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
