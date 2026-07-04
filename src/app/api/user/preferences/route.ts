import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  inAppNotificationsEnabled: z.boolean().optional(),
  emailRemindersEnabled: z.boolean().optional(),
  emailReminderLeadMinutes: z.number().int().min(0).max(30).optional(),
  weeklySummaryEnabled: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
});

/* =========================
   GET
========================= */

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    // Auto-create defaults if missing
    if (!preferences) {
      [preferences] = await db
        .insert(userPreferences)
        .values({
          userId: session.user.id,
        })
        .returning();
    }

    return NextResponse.json(preferences);
  } catch (err) {
    console.error("[PREFERENCES_GET_ERROR]", err);

    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH
========================= */

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const values = parsed.data;

    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    if (!existing) {
      await db.insert(userPreferences).values({
        userId: session.user.id,
      });
    }

    const [updated] = await db
      .update(userPreferences)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, session.user.id))
      .returning();

    return NextResponse.json({
      success: true,
      preferences: updated,
    });
  } catch (err) {
    console.error("[PREFERENCES_PATCH_ERROR]", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}