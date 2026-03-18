import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActivityCompleteness } from "@/lib/activityCompleteness";
import { runInsightProcessors } from "@/lib/insights";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activityId } = await params;

    const activity = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity.length) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    const current = activity[0];

    // 🔐 ownership check
    if (current.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(current);

  } catch (error) {
    console.error("GET ACTIVITY ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activityId } = await params;
    const body = await req.json();

    const { startTime, endTime, notes, metadata } = body;

    /* ================= GET ACTIVITY ================= */

    const activity = await db
      .select()
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity.length) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    const current = activity[0].activities;
    const currentType = activity[0].activity_types;

    /* ================= AUTH ================= */

    if (current.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= VALIDATION ================= */

    const newStart = startTime ? new Date(startTime) : current.startTime;
    const newEnd =
      endTime !== undefined
        ? endTime
          ? new Date(endTime)
          : null
        : current.endTime;

    if (newStart && isNaN(newStart.getTime())) {
      return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
    }

    if (newEnd && isNaN(newEnd.getTime())) {
      return NextResponse.json({ error: "Invalid endTime" }, { status: 400 });
    }

    if (newStart && newEnd && newEnd.getTime() < newStart.getTime()) {
      return NextResponse.json({ error: "End before start" }, { status: 400 });
    }

    const newMetadata = metadata ?? current.metadata;

    /* ================= DURATION ================= */

    let durationMinutes: number | null = null;

    if (newStart && newEnd) {
      durationMinutes = Math.max(
        0,
        Math.round((newEnd.getTime() - newStart.getTime()) / 60000)
      );
    }

    const dataCompleteness = getActivityCompleteness(
      currentType.name,
      newMetadata,
      newEnd
    );

    /* ================= UPDATE ================= */

    await db
      .update(activities)
      .set({
        startTime: newStart,
        endTime: newEnd,
        durationMinutes,
        notes: notes ?? current.notes,
        metadata: newMetadata,
        dataCompleteness,
      })
      .where(eq(activities.id, activityId));

    runInsightProcessors({
      babyId: current.babyId,
      activityId,
      expireStale: true,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      dataCompleteness,
    });

  } catch (error) {
    console.error("PATCH ACTIVITY ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
