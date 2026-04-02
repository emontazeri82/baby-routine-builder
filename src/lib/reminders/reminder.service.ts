// reminders/reminder.service.ts
// IMPORTS
// =========================

import {
  listReminders,
  getReminderById,
} from "@/lib/reminders/reminder.reads";

import {
  createReminder,
  updateReminder,
  pauseReminder,
  resumeReminder,
  expireOldOccurrences,
} from "@/lib/reminders/reminder.commands";

import {
  generateOccurrencesForActiveReminders,
} from "@/lib/reminderEngine/generateOccurrences";

// =========================
// SERVICE LAYER (ORCHESTRATION)
// =========================

/**
 * LIST REMINDERS (FULL ORCHESTRATION)
 */
export async function listRemindersService(params: {
  babyId: string;
  userId: string;
  status: "active" | "paused" | "cancelled" | "all";
}) {
  // ✅ cleanup expired
  await expireOldOccurrences();

  // ✅ generate upcoming occurrences (CRITICAL)
  await generateOccurrencesForActiveReminders({
    babyId: params.babyId,
    horizonDays: 14,
    maxOccurrences: 50,
  });

  // ✅ fetch data
  return listReminders(params);
}

/**
 * GET SINGLE REMINDER
 */
export async function getReminderService(params: {
  reminderId: string;
  userId: string;
}) {
  return getReminderById(params);
}

/**
 * CREATE REMINDER
 */
export async function createReminderService(params: {
  input: any;
  userId: string;
}) {
  return createReminder(params);
}

/**
 * UPDATE REMINDER
 */
export async function updateReminderService(params: {
  reminderId: string;
  userId: string;
  input: any;
}) {
  return updateReminder(params);
}

/**
 * PAUSE
 */
export async function pauseReminderService(params: {
  reminderId: string;
  userId: string;
}) {
  return pauseReminder(params);
}

/**
 * RESUME
 */
export async function resumeReminderService(params: {
  reminderId: string;
  userId: string;
}) {
  return resumeReminder(params);
}
