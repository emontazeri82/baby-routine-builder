import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { activities, babies, activityTypes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ActivityClient from "@/components/activity/ActivityClient";

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ babyId: string }>;
}) {
  const { babyId } = await params;   // ✅ unwrap once

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // ✅ use babyId (NOT params.babyId)
  const baby = await db
    .select()
    .from(babies)
    .where(eq(babies.id, babyId))
    .limit(1);

  if (!baby.length || baby[0].userId !== userId) {
    redirect("/dashboard/babies");
  }

  // ✅ use babyId again
  const activityData = await db
    .select({
      id: activities.id,
      startTime: activities.startTime,
      endTime: activities.endTime,
      notes: activities.notes,
      babyId: activities.babyId,
      activityName: activityTypes.name,
    })
    .from(activities)
    .leftJoin(
      activityTypes,
      eq(activities.activityTypeId, activityTypes.id)
    )
    .where(eq(activities.babyId, babyId))
    .orderBy(desc(activities.startTime))
    .limit(50);

  return (
    <ActivityClient
      activities={activityData}
      babyName={baby[0].name}
    />
  );
}
