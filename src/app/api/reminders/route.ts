import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reminders, babies, activityTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

/* =========================
   ZOD SCHEMA
========================= */

const createReminderSchema = z.object({
  babyId: z.string().uuid(),
  activitySlug: z.string().min(1),
  remindAt: z.string().min(1),
  notes: z.string().optional(),
});

/* =========================
   POST /api/reminders
========================= */

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createReminderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { babyId, activitySlug, remindAt, notes } = parsed.data;

    /* =========================
       Verify Baby Ownership
    ========================== */

    const baby = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1);

    if (!baby.length || baby[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: "Baby not found or not authorized" },
        { status: 403 }
      );
    }

    /* =========================
       Find Activity Type by Slug
    ========================== */

    const activityType = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.slug, activitySlug))
      .limit(1);

    if (!activityType.length) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    /* =========================
       Insert Reminder
    ========================== */

    const remindDate = new Date(remindAt);

    if (isNaN(remindDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const [newReminder] = await db
      .insert(reminders)
      .values({
        babyId,
        activityTypeId: activityType[0].id,
        title: activitySlug,
        remindAt: remindDate,
        createdBy: session.user.id,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newReminder, { status: 201 });

  } catch (error: any) {
    console.error("Reminder POST error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
