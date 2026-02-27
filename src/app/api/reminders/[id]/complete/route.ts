import { db } from "@/lib/db";
import { reminders, activities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function completeReminder(reminderId: string) {
  return await db.transaction(async (tx) => {
    // 1️⃣ Get reminder
    const reminder = await tx
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1)
      .then((r) => r[0]);

    if (!reminder) {
      throw new Error("Reminder not found");
    }

    if (!reminder.activityTypeId) {
      throw new Error("Reminder has no activity type");
    }

    // 2️⃣ Create Activity
    const [newActivity] = await tx
      .insert(activities)
      .values({
        babyId: reminder.babyId,
        activityTypeId: reminder.activityTypeId,
        startTime: new Date(),
        createdBy: reminder.createdBy ?? undefined,
      })
      .returning();

    // 3️⃣ Update Reminder
    await tx
      .update(reminders)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        linkedActivityId: newActivity.id,
      })
      .where(eq(reminders.id, reminderId));

    return newActivity;
  });
}
