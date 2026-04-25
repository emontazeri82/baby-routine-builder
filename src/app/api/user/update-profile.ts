import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/* ---------------- Validation Schema ---------------- */
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name too short")
    .max(50, "Name too long")
    .trim(),
});

/* ---------------- Handler ---------------- */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ Method check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Auth check
    const session = await auth();

    if (!session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ Validate input
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten(),
      });
    }

    const { name } = parsed.data;

    // ✅ Update using Drizzle
    await db
      .update(users)
      .set({
        name,
        updatedAt: new Date(), // if you have this column
      })
      .where(eq(users.id, session.user.id));

    // ✅ Success response
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("[UPDATE_PROFILE_ERROR]", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}