import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { getTemperatureAnalytics } from "@/services/analytics";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(60).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    days: url.searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { babyId, days = 7 } = parsed.data;

  const owned = await db
    .select({ id: babies.id })
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, session.user.id)))
    .limit(1);

  if (!owned.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const result = await getTemperatureAnalytics({
    babyId,
    startDate,
    endDate,
  });

  return NextResponse.json(result);
}
