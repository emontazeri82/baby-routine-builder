import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BabiesClient from "@/components/baby/BabiesClient";

export default async function BabiesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, session.user.id));

  return <BabiesClient babies={userBabies} />;
}
