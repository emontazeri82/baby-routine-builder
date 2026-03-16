import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const babyId = searchParams.get("babyId");

    if (!babyId) {
      return NextResponse.json(
        { error: "babyId is required" },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(insights)
      .where(and(eq(insights.babyId, babyId), isNull(insights.expiredAt)))
      .orderBy(desc(insights.createdAt))
      .limit(20);

    return NextResponse.json({
      insights: result
    });

  } catch (error) {
    console.error("GET INSIGHTS ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
