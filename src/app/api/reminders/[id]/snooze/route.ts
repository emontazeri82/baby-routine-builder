import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  isReminderDomainError,
  snoozeInputSchema,
  snoozeOccurrence,
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

  const parsed = snoozeInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_SNOOZE_PAYLOAD",
      message: "Invalid snooze payload.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const { id: reminderId } = await params;
    const occurrence = await snoozeOccurrence({
      reminderId,
      userId: session.user.id,
      minutes: parsed.data.minutes,
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
        message: "No pending occurrence found to snooze.",
      });
    }
    if (isReminderDomainError(error) && error.code === "MAX_SNOOZE_REACHED") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "Maximum snoozes reached for this occurrence.",
      });
    }
    if (isReminderDomainError(error) && error.code === "SNOOZE_DISABLED") {
      return reminderError({
        httpStatus: 400,
        code: error.code,
        message: "Snooze is disabled for this reminder.",
      });
    }

    return reminderError({
      httpStatus: 500,
      code: "SNOOZE_REMINDER_FAILED",
      message: "Failed to snooze reminder",
    });
  }
}
