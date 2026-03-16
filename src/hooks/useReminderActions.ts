"use client";

import {
  completeReminder as completeReminderApi,
  snoozeReminder as snoozeReminderApi,
  skipReminder as skipReminderApi,
  rescheduleReminder as rescheduleReminderApi,
  updateReminderStatus as updateReminderStatusApi,
  deleteReminder as deleteReminderApi,
} from "@/services/reminderService";

export function useReminderActions() {
  async function completeReminder(
    reminderId: string,
    payload?: { occurrenceId?: string; linkedActivityId?: string }
  ) {
    return completeReminderApi(reminderId, payload);
  }

  async function snoozeReminder(
    reminderId: string,
    payload: { minutes: number; occurrenceId?: string }
  ) {
    return snoozeReminderApi(reminderId, payload);
  }

  async function skipReminder(reminderId: string) {
    return skipReminderApi(reminderId);
  }

  async function rescheduleReminder(
    reminderId: string,
    payload: { remindAt: string; occurrenceId?: string }
  ) {
    return rescheduleReminderApi(reminderId, payload);
  }

  async function updateReminderStatus(
    reminderId: string,
    status: "active" | "paused" | "cancelled"
  ) {
    return updateReminderStatusApi(reminderId, status);
  }

  async function deleteReminder(reminderId: string) {
    return deleteReminderApi(reminderId);
  }

  return {
    completeReminder,
    snoozeReminder,
    skipReminder,
    rescheduleReminder,
    updateReminderStatus,
    deleteReminder,
  };
}
