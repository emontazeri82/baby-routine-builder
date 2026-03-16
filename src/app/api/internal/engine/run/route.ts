import { NextResponse } from "next/server";

import {
  dispatchDueOccurrences,
  processFailedNotifications,
} from "@/lib/reminderEngine/dispatchDueOccurrences";
import { generateOccurrencesForActiveReminders } from "@/lib/reminderEngine/generateOccurrences";

function isAuthorized(req: Request) {
  const secret = process.env.REMINDER_ENGINE_SECRET;
  const header = req.headers.get("x-engine-secret");
  return Boolean(secret) && Boolean(header) && header === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generatedResult = await generateOccurrencesForActiveReminders({
    // global autonomous runner by design
    babyId: undefined,
  });
  const dispatchResult = await dispatchDueOccurrences();
  await processFailedNotifications();

  return NextResponse.json({
    generated: generatedResult.inserted,
    processed: dispatchResult.processedCount,
    skipped: dispatchResult.skippedCount,
    timestamp: new Date().toISOString(),
  });
}
