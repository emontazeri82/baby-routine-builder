import { NextResponse } from "next/server";
import { sendReminderEmail } from "@/lib/email/sendReminderEmail";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sendReminderEmail({
    to: "montazeriebrahim1982@gmail.com",
    babyName: "Emma",
    reminderTitle: "Feed Baby",
    scheduledFor: "Today at 8:00 AM",
    actionUrl: "http://localhost:3000/dashboard",
  });

  return NextResponse.json({
    success: true,
    result,
  });
}
