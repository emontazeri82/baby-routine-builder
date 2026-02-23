import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { reminders, babies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ReminderClient from "@/components/reminders/ReminderClient";

export default async function RemindersPage({
  params,
}: {
  params: Promise<{ babyId: string }>;
}) {
  const { babyId } = await params;

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  if (!baby.length || baby[0].userId !== session.user.id) {
    redirect("/dashboard/babies");
  }

  const allReminders = await db
    .select()
    .from(reminders)
    .where(eq(reminders.babyId, babyId))
    .orderBy(desc(reminders.createdAt));

  return (
    <ReminderClient
      reminders={allReminders}
      baby={baby[0]}   // better than babies={baby}
    />
  );
}

