import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { dispatchDueOccurrences } from "@/lib/reminderEngine/dispatchDueOccurrences";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";
import {
  createReminder,
  createReminderInputSchema,
  isReminderDomainError,
  listReminders,
} from "@/lib/reminderService";
import { reminderError } from "./_utils";

const listSchema = z.object({
  babyId: z.string().uuid(),
  status: z.enum(["active", "paused", "cancelled", "all"]).default("active"),
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
  const parsed = listSchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    status: url.searchParams.get("status") ?? "active",
  });

  if (!parsed.success) {
    return reminderError({
      httpStatus: 400,
      code: "INVALID_QUERY",
      message: "Invalid reminder list query.",
      details: parsed.error.flatten(),
    });
  }

  try {
    await generateOccurrencesForActiveReminders({
      babyId: parsed.data.babyId,
    });
    await dispatchDueOccurrences({
      babyId: parsed.data.babyId,
    });

    const reminders = await listReminders({
      babyId: parsed.data.babyId,
      userId: session.user.id,
      status: parsed.data.status,
    });
    console.log(reminders);
    return NextResponse.json({ reminders });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return reminderError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }

    console.error("List reminders error:", error);
    return reminderError({
      httpStatus: 500,
      code: "LIST_REMINDERS_FAILED",
      message: "Failed to load reminders",
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

  try {
    const body = await req.json();
    const parsed = createReminderInputSchema.safeParse(body);

    if (!parsed.success) {
      return reminderError({
        httpStatus: 400,
        code: "INVALID_REMINDER_PAYLOAD",
        message: "Invalid reminder payload.",
        details: parsed.error.flatten(),
      });
    }

    const reminder = await createReminder({
      input: parsed.data,
      userId: session.user.id,
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    if (isReminderDomainError(error) && error.code === "FORBIDDEN") {
      return reminderError({
        httpStatus: 403,
        code: error.code,
        message: "Forbidden",
      });
    }

    console.error("Create Reminder Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create reminder";

    return reminderError({
      httpStatus: 500,
      code: "CREATE_REMINDER_FAILED",
      message,
    });
  }
}
