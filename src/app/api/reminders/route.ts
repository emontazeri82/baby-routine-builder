import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reminders, babies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseExpression } from "cron-parser";

/* =========================================================
   GET  →  List reminders
   Query params:
   - babyId (required)
   - status: active | completed | skipped | all
========================================================= */

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const babyId = searchParams.get("babyId");
  const status = searchParams.get("status") ?? "active";

  if (!babyId) {
    return NextResponse.json(
      { error: "babyId is required" },
      { status: 400 }
    );
  }

  // 🔒 Verify baby ownership
  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1)
    .then((r) => r[0]);

  if (!baby || baby.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Unauthorized baby access" },
      { status: 403 }
    );
  }

  let whereCondition = eq(reminders.babyId, babyId);

  if (status === "active") {
    whereCondition = and(
      eq(reminders.babyId, babyId),
      eq(reminders.isActive, true)
    );
  }

  if (status === "completed") {
    whereCondition = and(
      eq(reminders.babyId, babyId),
      eq(reminders.isCompleted, true)
    );
  }

  if (status === "skipped") {
    whereCondition = and(
      eq(reminders.babyId, babyId),
      eq(reminders.isSkipped, true)
    );
  }

  const result = await db
    .select()
    .from(reminders)
    .where(whereCondition);

  return NextResponse.json({ reminders: result });
}

/* =========================================================
   POST → Create Reminder
========================================================= */

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      babyId,
      activityTypeId,
      title,
      remindAt,
      cronExpression,
    } = body;

    if (!babyId || !remindAt) {
      return NextResponse.json(
        { error: "babyId and remindAt are required" },
        { status: 400 }
      );
    }

    // 🔒 Verify baby ownership
    const baby = await db
      .select()
      .from(babies)
      .where(eq(babies.id, babyId))
      .limit(1)
      .then((r) => r[0]);

    if (!baby || baby.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized baby access" },
        { status: 403 }
      );
    }

    const parsedRemindAt = new Date(remindAt);
    if (isNaN(parsedRemindAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid remindAt date" },
        { status: 400 }
      );
    }

    let nextRun: Date | null = parsedRemindAt;

    // 🧠 If recurring, validate cron and compute nextRun
    if (cronExpression) {
      try {
        const interval = parseExpression(cronExpression, {
          currentDate: new Date(),
        });
        nextRun = interval.next().toDate();
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid cron expression" },
          { status: 400 }
        );
      }
    }

    const [newReminder] = await db
      .insert(reminders)
      .values({
        babyId,
        activityTypeId: activityTypeId ?? null,
        title: title ?? null,
        remindAt: parsedRemindAt,
        cronExpression: cronExpression ?? null,
        nextRun,
        isActive: true,
        isCompleted: false,
        isSkipped: false,
        snoozedCount: 0,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ reminder: newReminder }, { status: 201 });
  } catch (error) {
    console.error("Create Reminder Error:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}
