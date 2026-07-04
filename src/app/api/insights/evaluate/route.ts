import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { runInsightProcessors } from "@/lib/insights";

const babyIdSchema = z.string().uuid();

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const babyId = await readBabyId(req);
  const parsed = babyIdSchema.safeParse(babyId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid babyId is required" },
      { status: 400 }
    );
  }

  const owned = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, parsed.data), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!owned.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const insights = await runInsightProcessors({
    babyId: parsed.data,
    expireStale: true,
  });
  return NextResponse.json({ ok: true, insights, count: insights.length });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
