import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { dispatchDueOccurrences } from "@/lib/reminderEngine/dispatchDueOccurrences";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";
import { getDueOccurrencesForBaby, isReminderDomainError } from "@/lib/reminderService";
import { reminderError } from "../_utils";

const querySchema = z.object({
  babyId: z.string().uuid(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return reminderError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ babyId: url.searchParams.get("babyId") });

  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_DUE_QUERY",
      message: "Invalid due reminders query.",
      details: parsed.error.flatten(),
    });
  }

  try {
    const due = await getDueOccurrencesForBaby({
      babyId: parsed.data.babyId,
      userId: session.user.id,
    });

    return NextResponse.json({ due });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return reminderError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }
    return reminderError({
      httpStatus: 500,
      code: "GET_DUE_REMINDERS_FAILED",
      message: "Failed to load due reminders",
    });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return reminderError({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = querySchema.safeParse({ babyId: body?.babyId });

  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_DUE_PAYLOAD",
      message: "Invalid due reminders payload.",
      details: parsed.error.flatten(),
    });
  }
  try {
    await generateOccurrencesForActiveReminders({ babyId: parsed.data.babyId });
    const result = await dispatchDueOccurrences({ babyId: parsed.data.babyId });
    const due = await getDueOccurrencesForBaby({
      babyId: parsed.data.babyId,
      userId: session.user.id,
    });

    return NextResponse.json({ ...result, due });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return reminderError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }
    return reminderError({
      httpStatus: 500,
      code: "DISPATCH_DUE_REMINDERS_FAILED",
      message: "Failed to dispatch due reminders",
    });
  }
}
