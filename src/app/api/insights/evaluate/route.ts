import { NextResponse } from "next/server";
import { runInsightProcessors } from "@/lib/insights";

async function readBabyId(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get("babyId");
  if (fromQuery) return fromQuery;

  try {
    const body = await req.json();
    if (body && typeof body.babyId === "string") {
      return body.babyId;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function POST(req: Request) {
  const babyId = await readBabyId(req);
  if (!babyId) {
    return NextResponse.json(
      { error: "babyId is required" },
      { status: 400 }
    );
  }

  const insights = await runInsightProcessors({
    babyId,
    expireStale: true,
  });
  return NextResponse.json({ ok: true, insights, count: insights.length });
}

export async function GET(req: Request) {
  return POST(req);
}
