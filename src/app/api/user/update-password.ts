import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verify, hash } from "argon2";

/* ---------------- Validation ---------------- */
const schema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
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

    const { currentPassword, newPassword } = parsed.data;

    // ✅ Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Verify current password
    const isValid = await verify(user.passwordHash, currentPassword);

    if (!isValid) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    // ⚠️ Prevent reuse
    const samePassword = await verify(user.passwordHash, newPassword);
    if (samePassword) {
      return res.status(400).json({
        error: "New password must be different",
      });
    }

    // ✅ Hash new password
    const hashedPassword = await hash(newPassword);

    // ✅ Update DB
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (err) {
    console.error("[UPDATE_PASSWORD_ERROR]", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}