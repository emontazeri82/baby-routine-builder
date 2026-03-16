import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  cancelReminder,
  getReminderById,
  isReminderDomainError,
  ReminderValidationError,
  updateReminder,
  updateReminderInputSchema,
} from "@/lib/reminderService";
import { reminderError } from "../_utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return reminderError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  try {
    const { id } = await params;
    const reminder = await getReminderById({ reminderId: id, userId: session.user.id });
    return NextResponse.json({ reminder });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "NOT_FOUND") {
      return reminderError({
        httpStatus: 404,
        code: error.code,
        message: "Reminder not found.",
      });
    }
    return reminderError({
      httpStatus: 500,
      code: "GET_REMINDER_FAILED",
      message: "Failed to load reminder",
    });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return reminderError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateReminderInputSchema.safeParse(body);
  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_UPDATE_PAYLOAD",
      message: "Invalid reminder update payload.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const { id } = await params;
    const reminder = await updateReminder({
      reminderId: id,
      userId: session.user.id,
      input: parsed.data,
    });

    return NextResponse.json({ reminder });
  } catch (error) {
    if (error instanceof ReminderValidationError) {
      return reminderError({
        httpStatus: 400,
        code: "REMINDER_VALIDATION_FAILED",
        message: error.message,
        details: error.fieldErrors,
      });
    }
    if (isReminderDomainError(error) && error.code === "NOT_FOUND") {
      return reminderError({
        httpStatus: 404,
        code: error.code,
        message: "Reminder not found.",
      });
    }
    return reminderError({
      httpStatus: 500,
      code: "UPDATE_REMINDER_FAILED",
      message: "Failed to update reminder",
    });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return reminderError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  try {
    const { id } = await params;
    await cancelReminder({ reminderId: id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "NOT_FOUND") {
      return reminderError({
        httpStatus: 404,
        code: error.code,
        message: "Reminder not found.",
      });
    }
    return reminderError({
      httpStatus: 500,
      code: "CANCEL_REMINDER_FAILED",
      message: "Failed to cancel reminder",
    });
  }
}
