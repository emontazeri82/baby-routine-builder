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
import type {
  CreateReminderInput,
  UpdateReminderInput,
} from "./reminder.validation";

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
  input: CreateReminderInput;
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
  input: UpdateReminderInput;
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
