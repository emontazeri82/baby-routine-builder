import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { getNotificationsForBaby } from "@/lib/reminderService";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";
import { dispatchDueOccurrences } from "@/lib/reminderEngine/dispatchDueOccurrences";

const querySchema = z.object({
  babyId: z.string().uuid(),
});

function notificationError(params: {
  httpStatus: number;
  code: string;
  message: string;
  details?: unknown;
}) {
  return NextResponse.json(
    {
      status: "error",
      code: params.code,
      message: params.message,
      details: params.details ?? null,
    },
    { status: params.httpStatus }
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return notificationError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
  });

  if (!parsed.success) {
    return notificationError({
      httpStatus: 400,
      code: "INVALID_QUERY",
      message: "Invalid notifications query.",
      details: parsed.error.flatten(),
    });
  }

  const owned = await db
    .select({ id: babies.id })
    .from(babies)
    .where(
      and(
        eq(babies.id, parsed.data.babyId),
        eq(babies.userId, session.user.id)
      )
    )
    .limit(1);

  if (!owned.length) {
    return notificationError({
      httpStatus: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  }

  try {
    await generateOccurrencesForActiveReminders({
      babyId: parsed.data.babyId,
    });
    await dispatchDueOccurrences({
      babyId: parsed.data.babyId,
    });

    const result = await getNotificationsForBaby({
      babyId: parsed.data.babyId,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return notificationError({
      httpStatus: 500,
      code: "NOTIFICATIONS_FETCH_FAILED",
      message: "Failed to load notifications",
    });
  }
}
