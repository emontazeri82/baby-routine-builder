import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isReminderDomainError, skipOccurrence } from "@/lib/reminderService";
import { reminderError } from "../../_utils";
import { runInsightProcessors } from "@/lib/insights";

export async function POST(
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
    const { id: reminderId } = await params;
    const occurrence = await skipOccurrence({
      reminderId,
      userId: session.user.id,
    });

    if (occurrence?.babyId) {
      runInsightProcessors({
        babyId: occurrence.babyId,
        expireStale: true,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, occurrence });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "NOT_FOUND") {
      return reminderError({
        httpStatus: 404,
        code: error.code,
        message: "Reminder not found.",
      });
    }
    if (isReminderDomainError(error) && error.code === "NO_DUE_OCCURRENCE") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "No overdue occurrence to skip right now.",
      });
    }
    if (isReminderDomainError(error) && error.code === "ALREADY_COMPLETED") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "Occurrence already completed.",
      });
    }
    if (isReminderDomainError(error) && error.code === "ALREADY_SKIPPED") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "Occurrence already skipped.",
      });
    }
    if (isReminderDomainError(error) && error.code === "SNOOZED_NOT_DUE") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "Occurrence is snoozed and not due yet.",
      });
    }

    return reminderError({
      httpStatus: 500,
      code: "SKIP_REMINDER_FAILED",
      message: "Failed to skip reminder",
    });
  }
}
