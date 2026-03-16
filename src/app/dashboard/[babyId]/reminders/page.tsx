import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import ReminderClient from "@/components/reminders/ReminderClient";
import { listReminders } from "@/lib/reminderService";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";
import { dispatchDueOccurrences } from "@/lib/reminderEngine/dispatchDueOccurrences";

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
    .select({
      id: babies.id,
      userId: babies.userId,
      name: babies.name,
    })
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  if (!baby.length || baby[0].userId !== session.user.id) {
    redirect("/dashboard/babies");
  }

  await generateOccurrencesForActiveReminders({ babyId });
  await dispatchDueOccurrences({ babyId });

  const reminders = await listReminders({
    babyId,
    userId: session.user.id,
    status: "all",
  });

  return <ReminderClient reminders={reminders} baby={baby[0]} />;
}
