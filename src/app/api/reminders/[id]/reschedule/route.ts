import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  isReminderDomainError,
  rescheduleInputSchema,
  rescheduleOccurrence,
} from "@/lib/reminderService";
import { reminderError } from "../../_utils";
import { runInsightProcessors } from "@/lib/insights";

export async function POST(
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

  const parsed = rescheduleInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_RESCHEDULE_PAYLOAD",
      message: "Invalid reschedule payload.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const { id: reminderId } = await params;

    const occurrence = await rescheduleOccurrence({
      reminderId,
      userId: session.user.id,
      remindAt: parsed.data.remindAt,
      occurrenceId: parsed.data.occurrenceId,
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
    if (isReminderDomainError(error) && error.code === "NO_OCCURRENCE") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "No pending occurrence found to reschedule.",
      });
    }

    return reminderError({
      httpStatus: 500,
      code: "RESCHEDULE_REMINDER_FAILED",
      message: "Failed to reschedule reminder",
    });
  }
}
