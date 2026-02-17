import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { reminders, babies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ReminderClient from "@/components/reminders/ReminderClient";

export default async function RemindersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, userId));

  const allReminders = await db
    .select()
    .from(reminders)
    .orderBy(desc(reminders.createdAt));

  return (
    <ReminderClient
      reminders={allReminders}
      babies={userBabies}
    />
  );
}
