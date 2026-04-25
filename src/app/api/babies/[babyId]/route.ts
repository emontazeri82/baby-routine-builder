import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateBabySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  gender: z.enum(["male", "female"]),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be YYYY-MM-DD"),
});

export async function PUT(
  req: Request,
  context: { params: Promise<{ babyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { babyId } = await context.params;

    const formData = await req.formData();
    const raw = {
      name: String(formData.get("name") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
    };

    const parsed = updateBabySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, gender, birthDate } = parsed.data;

    const [year, month, day] = birthDate.split("-").map(Number);
    const birth = new Date(year, month - 1, day);
    if (
      birth.getFullYear() !== year ||
      birth.getMonth() !== month - 1 ||
      birth.getDate() !== day
    ) {
      return NextResponse.json(
        { error: "Invalid calendar date." },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);
    if (birth > today) {
      return NextResponse.json(
        { error: "Birth date cannot be in the future." },
        { status: 400 }
      );
    }

    const updated = await db
      .update(babies)
      .set({ name, gender, birthDate })
      .where(
        and(eq(babies.id, babyId), eq(babies.userId, session.user.id))
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optional photo: stored client-side in UI only until upload pipeline exists
    // const file = formData.get("photo");

    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error("UPDATE BABY ERROR:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
