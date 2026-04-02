import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BabiesClient from "@/components/baby/BabiesClient";

import type { Baby } from "@/lib/types/baby";

export default async function BabiesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const rawBabies = await db
    .select({
      id: babies.id,
      name: babies.name,
      birthDate: babies.birthDate,
      gender: babies.gender,
      photoUrl: babies.photoUrl,
    })
    .from(babies)
    .where(eq(babies.userId, session.user.id))
    .limit(20);
  const userBabies: Baby[] = rawBabies.map((b) => ({
    id: b.id,
    name: b.name,
    birthDate: b.birthDate ? new Date(b.birthDate) : null,
    gender: b.gender,
    photoUrl: b.photoUrl,
  }));

  return <BabiesClient babies={userBabies} />;
}