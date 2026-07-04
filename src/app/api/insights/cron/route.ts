import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { runInsightProcessors } from "@/lib/insights";

function isAuthorized(req: Request) {
  const secret = process.env.REMINDER_ENGINE_SECRET;
  const engineSecret = req.headers.get("x-engine-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  return Boolean(secret) && (engineSecret === secret || bearerSecret === secret);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
