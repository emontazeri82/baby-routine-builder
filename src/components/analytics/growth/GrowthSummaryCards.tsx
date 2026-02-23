"use client";

interface Props {
  data: any[];
}

export default function GrowthSummaryCards({ data }: Props) {
  const latest = data[data.length - 1];
  const first = data[0];

  const totalGain =
    latest?.weight && first?.weight
      ? (latest.weight - first.weight).toFixed(2)
      : "—";

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <Card title="Latest Weight" value={latest?.weight ?? "—"} />
      <Card title="Latest Height" value={latest?.height ?? "—"} />
      <Card title="Head Circ." value={latest?.headCircumference ?? "—"} />
      <Card title="Total Weight Gain" value={totalGain} />
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
