"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function GrowthWeightChart({ data }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Weight Trend</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="weight" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
