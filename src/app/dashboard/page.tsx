import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   SAFE TIMEOUT (NO THROW)
========================= */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[TIMEOUT] ${label}`);
      resolve(null);
    }, ms);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/* =========================
   PAGE
========================= */
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  let firstBabyId: string | null = null;

  try {
    const result = await withTimeout(
      db
        .select({ id: babies.id })
        .from(babies)
        .where(eq(babies.userId, session.user.id))
        .limit(1),
      2000,
      "dashboard-root-baby"
    );

    if (!result || !Array.isArray(result) || result.length === 0) {
      redirect("/dashboard/babies");
    }

    firstBabyId = result[0].id;
  } catch (error) {
    console.error("[DASHBOARD ROOT ERROR]", error);
    redirect("/dashboard/babies");
  }

  if (!firstBabyId) {
    redirect("/dashboard/babies");
  }

  redirect(`/dashboard/${firstBabyId}`);
}
