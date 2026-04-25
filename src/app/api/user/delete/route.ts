import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verify } from "argon2";

const schema = z.object({
  password: z.string().min(6),
});

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

    const { password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await verify(user.passwordHash, password);

    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE_ACCOUNT_ERROR]", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
