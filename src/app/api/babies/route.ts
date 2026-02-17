import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                               ZOD VALIDATION                               */
/* -------------------------------------------------------------------------- */

const babySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  gender: z.enum(["male", "female"]),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be YYYY-MM-DD"),
  timezone: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* ---------------------- AUTH CHECK ---------------------- */

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ---------------------- PARSE BODY ---------------------- */

    const body = await req.json();
    const parsed = babySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, gender, birthDate, timezone } = parsed.data;

    /* ---------------------- DATE VALIDATION ---------------------- */

    const [year, month, day] = birthDate.split("-").map(Number);

    const birth = new Date(year, month - 1, day);

    // Validate real calendar date (prevents 2026-02-31)
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

    // Compare to local today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);

    if (birth > today) {
      return NextResponse.json(
        { error: "Birth date cannot be in the future." },
        { status: 400 }
      );
    }

    /* ---------------------- TIMEZONE HANDLING ---------------------- */

    const detectedTimezone =
      timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";

    /* ---------------------- INSERT ---------------------- */

    const inserted = await db
      .insert(babies)
      .values({
        name,
        gender,
        birthDate, // YYYY-MM-DD string for pg date column
        userId: session.user.id,
        timezone: detectedTimezone,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });

  } catch (error) {
    console.error("CREATE BABY ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
