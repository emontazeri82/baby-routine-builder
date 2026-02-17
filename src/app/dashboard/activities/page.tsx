import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { activities, babies, activityTypes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ActivityClient from "@/components/activity/ActivityClient";

export default async function ActivitiesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, userId));

  const activityData = await db
    .select({
      id: activities.id,
      startTime: activities.startTime,
      endTime: activities.endTime,
      notes: activities.notes,
      babyId: activities.babyId,
      babyName: babies.name,
      activityName: activityTypes.name,
    })
    .from(activities)
    .leftJoin(babies, eq(activities.babyId, babies.id))
    .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .orderBy(desc(activities.startTime))
    .limit(50);

  return (
    <ActivityClient
      activities={activityData}
      babies={userBabies}
    />
  );
}
