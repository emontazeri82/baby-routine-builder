import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies, activities, reminders, activityTypes } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

const querySchema = z.object({
  babyId: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      babyId: url.searchParams.get("babyId"),
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { babyId, start, end } = parsed.data;

    // verify baby ownership
    const baby = await db.select().from(babies).where(eq(babies.id, babyId)).limit(1);
    if (!baby.length || baby[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Fetch activities in range
    const acts = await db
      .select({
        id: activities.id,
        babyId: activities.babyId,
        startTime: activities.startTime,
        endTime: activities.endTime,
        notes: activities.notes,
        activityTypeId: activities.activityTypeId,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug, // (after you add slug)
        color: activityTypes.color,
        icon: activityTypes.icon,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(activities.babyId, babyId),
          gte(activities.startTime, startDate),
          lte(activities.startTime, endDate)
        )
      );

    // Fetch reminders in range (use remindAt)
    const rems = await db
      .select({
        id: reminders.id,
        babyId: reminders.babyId,
        remindAt: reminders.remindAt,
        notes: reminders.title, // you can store notes later; for now title/notes separation might evolve
        isActive: reminders.isActive,
        activityTypeId: reminders.activityTypeId,
        typeName: activityTypes.name,
        typeSlug: activityTypes.slug,
        color: activityTypes.color,
        icon: activityTypes.icon,
      })
      .from(reminders)
      .leftJoin(activityTypes, eq(reminders.activityTypeId, activityTypes.id))
      .where(
        and(
          eq(reminders.babyId, babyId),
          gte(reminders.remindAt, startDate),
          lte(reminders.remindAt, endDate)
        )
      );

    const events = [
      ...acts.map((a) => ({
        id: `activity:${a.id}`,
        type: "activity",
        sourceId: a.id,
        babyId: a.babyId,
        title: a.typeName ?? "Activity",
        start: a.startTime.toISOString(),
        end: a.endTime ? a.endTime.toISOString() : undefined,
        activityTypeId: a.activityTypeId,
        activityTypeSlug: a.typeSlug ?? undefined,
        color: a.color ?? undefined,
        icon: a.icon ?? undefined,
        notes: a.notes ?? undefined,
      })),
      ...rems.map((r) => ({
        id: `reminder:${r.id}`,
        type: "reminder",
        sourceId: r.id,
        babyId: r.babyId,
        title: r.typeName ?? "Reminder",
        start: r.remindAt?.toISOString(),
        activityTypeId: r.activityTypeId ?? undefined,
        activityTypeSlug: r.typeSlug ?? undefined,
        color: r.color ?? undefined,
        icon: r.icon ?? undefined,
        isActive: r.isActive ?? true,
        notes: null,
      })),
    ].filter((e) => Boolean(e.start));

    return NextResponse.json(events);
  } catch (err) {
    console.error("GET /api/calendar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
