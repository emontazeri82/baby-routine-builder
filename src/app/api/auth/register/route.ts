import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { registerSchema } from "@/validations/auth.schema";

/**
 * Production-grade Register Route
 * - Argon2id hashing
 * - Transaction safe
 * - Duplicate email protection
 * - No internal leaks
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser.length > 0) {
        return { error: "EMAIL_EXISTS" };
      }

      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });

      await tx.insert(users).values({
        name,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        emailVerified: true,
        isActive: true,
      });

      return { success: true };
    });

    if (result.error === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );

  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Register error:", error);
    }

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

