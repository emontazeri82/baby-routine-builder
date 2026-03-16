import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { runInsightProcessors } from "@/lib/insights";

export async function POST() {
  const allBabies = await db.select({ id: babies.id }).from(babies);
  const babyIds = allBabies.map((b) => b.id);

  const results = await Promise.all(
    babyIds.map((babyId) =>
      runInsightProcessors({ babyId, expireStale: true })
    )
  );

  const totalInsights = results.reduce(
    (sum, list) => sum + list.length,
    0
  );

  return NextResponse.json({
    ok: true,
    processedBabies: babyIds.length,
    totalInsights,
  });
}

export async function GET() {
  return POST();
}
