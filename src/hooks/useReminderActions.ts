
"use client";

import {
  completeReminder as completeReminderApi,
  snoozeReminder as snoozeReminderApi,
  skipReminder as skipReminderApi,
  rescheduleReminder as rescheduleReminderApi,
  updateReminderStatus as updateReminderStatusApi,
  deleteReminder as deleteReminderApi,
} from "@/services/reminder";

import type {
  ActionResult,
  CompleteReminderResponse,
} from "@/lib/types/reminder";

export function useReminderActions() {
  async function completeReminder(
    reminderId: string,
    payload?: {
      occurrenceId?: string;
      linkedActivityId?: string;
      autoCreateActivity?: boolean;
    }
  ): Promise<ActionResult<CompleteReminderResponse>> {
    return completeReminderApi(reminderId, payload);
  }

  async function snoozeReminder(
    reminderId: string,
    payload: { minutes: number; occurrenceId?: string }
  ): Promise<ActionResult> {
    return snoozeReminderApi(reminderId, payload);
  }

  async function skipReminder(
    reminderId: string,
    payload?: { occurrenceId?: string }
  ): Promise<ActionResult> {
    return skipReminderApi(reminderId, payload);
  }

  async function rescheduleReminder(
    reminderId: string,
    payload: { remindAt: string; occurrenceId?: string; timezone?: string }
  ): Promise<ActionResult> {
    return rescheduleReminderApi(reminderId, payload);
  }

  async function updateReminderStatus(
    reminderId: string,
    status: "active" | "paused" | "cancelled"
  ): Promise<ActionResult> {
    return updateReminderStatusApi(reminderId, status);
  }

  async function deleteReminder(
    reminderId: string
  ): Promise<ActionResult> {
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