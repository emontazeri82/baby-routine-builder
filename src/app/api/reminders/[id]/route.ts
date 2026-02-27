import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reminders, babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseExpression } from "cron-parser";

/* =========================================================
   Helper → Fetch reminder + verify ownership
========================================================= */

async function getReminderWithOwnership(
  reminderId: string,
  userId: string
) {
  const reminder = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .limit(1)
    .then((r) => r[0]);

  if (!reminder) return null;

  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, reminder.babyId))
    .limit(1)
    .then((r) => r[0]);

  if (!baby || baby.userId !== userId) return null;

  return reminder;
}

/* =========================================================
   GET → Fetch single reminder
========================================================= */

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminder = await getReminderWithOwnership(
    params.id,
    session.user.id
  );

  if (!reminder) {
    return NextResponse.json(
      { error: "Reminder not found or unauthorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ reminder });
}

/* =========================================================
   PATCH → Update reminder safely
========================================================= */

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminder = await getReminderWithOwnership(
      params.id,
      session.user.id
    );

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const {
      title,
      remindAt,
      cronExpression,
      isActive,
    } = body;

    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (remindAt !== undefined) {
      const parsed = new Date(remindAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid remindAt date" },
          { status: 400 }
        );
      }
      updateData.remindAt = parsed;
      updateData.nextRun = parsed;
    }

    if (cronExpression !== undefined) {
      if (cronExpression) {
        try {
          const interval = parseExpression(cronExpression);
          updateData.cronExpression = cronExpression;
          updateData.nextRun = interval.next().toDate();
        } catch {
          return NextResponse.json(
            { error: "Invalid cron expression" },
            { status: 400 }
          );
        }
      } else {
        updateData.cronExpression = null;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // 🚫 Prevent updating completed reminder to active without reset
    if (reminder.isCompleted && isActive === true) {
      return NextResponse.json(
        { error: "Cannot reactivate completed reminder without reset" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(reminders)
      .set(updateData)
      .where(eq(reminders.id, params.id))
      .returning();

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    console.error("Update Reminder Error:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE → Soft delete (recommended)
========================================================= */

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminder = await getReminderWithOwnership(
    params.id,
    session.user.id
  );

  if (!reminder) {
    return NextResponse.json(
      { error: "Reminder not found or unauthorized" },
      { status: 404 }
    );
  }

  // 🧠 Instead of hard delete → deactivate
  await db
    .update(reminders)
    .set({ isActive: false })
    .where(eq(reminders.id, params.id));

  return NextResponse.json({ success: true });
}
