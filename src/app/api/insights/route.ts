import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies, insights } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

const querySchema = z.object({
  babyId: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      babyId: searchParams.get("babyId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { babyId } = parsed.data;
    const owned = await db
      .select({ id: babies.id })
      .from(babies)
      .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
      .limit(1);

    if (!owned.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db
      .select()
      .from(insights)
      .where(and(eq(insights.babyId, babyId), isNull(insights.expiredAt)))
      .orderBy(desc(insights.createdAt))
      .limit(20);

    return NextResponse.json({
      insights: result,
    });
  } catch (error) {
    console.error("GET INSIGHTS ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
