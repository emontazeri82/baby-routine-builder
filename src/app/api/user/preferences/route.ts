
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Accept BOTH shapes:
 * - notifications (from your current UI)
 * - notificationsEnabled (future-proof / direct)
 */
const schema = z.object({
  notifications: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  darkMode: z.boolean().optional(),
});

/* =========================
   GET - Load Preferences
========================= */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      notificationsEnabled: user?.notificationsEnabled ?? true,
      darkMode: user?.darkMode ?? false,
    });
  } catch (err) {
    console.error("[PREFERENCES_GET_ERROR]", err);

    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

/* =========================
   POST - Update Preferences
========================= */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      notifications,
      notificationsEnabled,
      darkMode,
    } = parsed.data;

    /**
     * Normalize value:
     * prefer notificationsEnabled, fallback to notifications
     */
    const finalNotifications =
      notificationsEnabled !== undefined
        ? notificationsEnabled
        : notifications;

    if (finalNotifications === undefined && darkMode === undefined) {
      return NextResponse.json(
        { error: "No preferences provided" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(users)
      .set({
        ...(finalNotifications !== undefined && {
          notificationsEnabled: finalNotifications,
        }),
        ...(darkMode !== undefined && {
          darkMode,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        notificationsEnabled: users.notificationsEnabled,
        darkMode: users.darkMode,
      });

    return NextResponse.json({
      success: true,
      message: "Preferences updated",
      preferences: updated[0],
    });
  } catch (err) {
    console.error("[PREFERENCES_POST_ERROR]", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}