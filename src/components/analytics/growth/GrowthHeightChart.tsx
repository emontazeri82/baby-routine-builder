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

interface Props {
  data: any[];
}

export default function GrowthHeightChart({ data }: Props) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString(),
  }));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">Height Trend</h2>

      {formattedData.length === 0 ? (
        <p className="text-gray-500 text-sm">No height data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="height"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
