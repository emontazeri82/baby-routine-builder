import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userBabies = await db
  .select({
    id: babies.id,
    name: babies.name,
  })
  .from(babies)
  .where(eq(babies.userId, session.user.id));

  if (!userBabies.length) {
    redirect("/dashboard/babies");
  }

  // 👇 Always go to first baby dashboard
  redirect(`/dashboard/${userBabies[0].id}`);
}

