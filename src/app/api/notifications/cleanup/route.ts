import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { cleanupOldReadNotifications, isReminderDomainError } from "@/lib/reminderService";

const querySchema = z.object({
  babyId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(3650).default(90),
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

export async function DELETE(req: Request) {
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
    days: url.searchParams.get("days") ?? 90,
  });

  if (!parsed.success) {
    return notificationError({
      httpStatus: 400,
      code: "INVALID_QUERY",
      message: "Invalid cleanup query.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const deleted = await cleanupOldReadNotifications({
      babyId: parsed.data.babyId,
      userId: session.user.id,
      olderThanDays: parsed.data.days,
    });

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
    });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return notificationError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }

    return notificationError({
      httpStatus: 500,
      code: "CLEANUP_FAILED",
      message: "Failed to cleanup notifications",
    });
  }
}

