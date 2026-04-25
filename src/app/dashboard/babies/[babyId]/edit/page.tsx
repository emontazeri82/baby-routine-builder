import EditBabyFormClient from "@/components/baby/EditBabyFormClient";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function EditBabyPage({
  params,
}: {
  params: Promise<{ babyId: string }>;
}) {
  const { babyId } = await params;

  const baby = await db
    .select({
      id: babies.id,
      name: babies.name,
      gender: babies.gender,
      birthDate: babies.birthDate,
      photoUrl: babies.photoUrl,
    })
    .from(babies)
    .where(eq(babies.id, babyId))
    .then((res) => res[0]);

  if (!baby) notFound();

  let month = "";
  let day = "";
  let year = "";

  if (baby.birthDate) {
    const d = new Date(baby.birthDate);
    month = d.getMonth().toString();
    day = d.getDate().toString();
    year = d.getFullYear().toString();
  }

  const initialData = {
    ...baby,
    month,
    day,
    year,
  };

  return <EditBabyFormClient babyId={babyId} initialData={initialData} />;
}
