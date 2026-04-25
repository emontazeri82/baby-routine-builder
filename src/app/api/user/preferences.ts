import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/* ---------------- Validation ---------------- */
const schema = z.object({
  notificationsEnabled: z.boolean().optional(),
  darkMode: z.boolean().optional(),
});

/* ---------------- Handler ---------------- */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten(),
      });
    }

    const updates = parsed.data;

    // ❗ Prevent empty updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No preferences provided",
      });
    }

    // ✅ Update preferences
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return res.status(200).json({
      success: true,
      message: "Preferences updated",
    });

  } catch (err) {
    console.error("[PREFERENCES_ERROR]", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}