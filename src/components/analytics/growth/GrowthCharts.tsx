"use client";

import GrowthWeightChart from "./GrowthWeightChart";
import GrowthHeightChart from "./GrowthHeightChart";
import GrowthHeadChart from "./GrowthHeadChart";

export default function GrowthCharts({ data }: any) {
  return (
    <div className="space-y-10">
      <GrowthWeightChart data={data} />
      <GrowthHeightChart data={data} />
      <GrowthHeadChart data={data} />
    </div>
  );
}
