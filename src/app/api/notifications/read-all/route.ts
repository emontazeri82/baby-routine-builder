import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isReminderDomainError, markAllNotificationsRead } from "@/lib/reminderService";

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

export async function PATCH(req: Request) {
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
      message: "babyId required",
      details: parsed.error.flatten(),
    });
  }

  try {
    await markAllNotificationsRead({
      babyId: parsed.data.babyId,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return notificationError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }
    console.error("Read-all notifications error:", error);
    return notificationError({
      httpStatus: 500,
      code: "MARK_ALL_READ_FAILED",
      message: "Failed to mark all read",
    });
  }
}
