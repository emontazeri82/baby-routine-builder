import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { completeOccurrence, isReminderDomainError } from "@/lib/reminderService";
import { reminderError } from "../../_utils";

import { runInsightProcessors } from "@/lib/insights";

const completeSchema = z.object({
  occurrenceId: z.string().uuid().optional(),
  linkedActivityId: z.string().uuid().optional(),
});

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

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return reminderError({
        httpStatus: 400,
        code: "INVALID_COMPLETE_PAYLOAD",
        message: "Invalid complete payload.",
        details: parsed.error.flatten(),
      });
    }

    const { id: reminderId } = await params;
    const occurrence = await completeOccurrence({
      reminderId,
      userId: session.user.id,
      occurrenceId: parsed.data.occurrenceId,
      linkedActivityId: parsed.data.linkedActivityId,
    });

    /* Trigger insight processors after reminder completion */
    if (occurrence?.babyId) {
      runInsightProcessors({
        babyId: occurrence.babyId,
        activityId: occurrence.linkedActivityId ?? undefined,
        expireStale: true
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
        message: "No overdue occurrence to complete right now.",
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
      code: "COMPLETE_REMINDER_FAILED",
      message: "Failed to complete reminder",
    });
  }
}
