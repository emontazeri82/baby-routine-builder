import { resend, EMAIL_FROM } from "./resend";
import { ReminderEmail } from "./templates/ReminderEmail";

type SendReminderEmailInput = {
  to: string;
  babyName: string;
  reminderTitle: string;
  scheduledFor: string;
  actionUrl: string;
};

export async function sendReminderEmail({
  to,
  babyName,
  reminderTitle,
  scheduledFor,
  actionUrl,
}: SendReminderEmailInput) {
  if (!resend) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `Reminder: ${reminderTitle}`,
    react: ReminderEmail({
      babyName,
      reminderTitle,
      scheduledFor,
      actionUrl,
    }),
  });
}