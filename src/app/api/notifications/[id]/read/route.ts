import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isReminderDomainError, markNotificationRead } from "@/lib/reminderService";

const paramsSchema = z.object({ id: z.string().uuid() });

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

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return notificationError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) {
    return notificationError({
      httpStatus: 400,
      code: "INVALID_NOTIFICATION_ID",
      message: "Invalid notification id.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const notification = await markNotificationRead({
      notificationId: parsed.data.id,
      userId: session.user.id,
    });

    return NextResponse.json({ notification });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "NOT_FOUND") {
      return notificationError({
        httpStatus: 404,
        code: error.code,
        message: "Notification not found.",
      });
    }
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return notificationError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }

    return notificationError({
      httpStatus: 500,
      code: "MARK_READ_FAILED",
      message: "Failed to mark notification as read",
    });
  }
}
