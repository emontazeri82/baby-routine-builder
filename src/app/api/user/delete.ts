import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verify } from "argon2";

/* ---------------- Validation ---------------- */
const schema = z.object({
  password: z.string().min(6),
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

    const { password } = parsed.data;

    // ✅ Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Verify password before deletion
    const isValid = await verify(user.passwordHash, password);

    if (!isValid) {
      return res.status(400).json({
        error: "Incorrect password",
      });
    }

    // 🔥 DELETE USER
    await db.delete(users).where(eq(users.id, user.id));

    // 👉 OPTIONAL: delete related data (VERY IMPORTANT for your app)
    /*
    await db.delete(activities).where(eq(activities.userId, user.id));
    await db.delete(reminders).where(eq(reminders.userId, user.id));
    */

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });

  } catch (err) {
    console.error("[DELETE_ACCOUNT_ERROR]", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}