"use client";

import axios, { AxiosResponse } from "axios";

/**
 * ================================
 * 🔹 SHARED TYPES
 * ================================
 */

export type ApiCallResult<T = unknown> = {
  ok: boolean;
  body: T;
};

export type ReminderStatus = "active" | "paused" | "cancelled";

export type CompleteReminderResponse = {
  success: boolean;
  occurrence: unknown;
  activityCreated: boolean;
};

/**
 * ================================
 * 🔹 AXIOS HANDLER (GENERIC)
 * ================================
 */

export async function handleAxios<T>(
  url: string,
  request: Promise<AxiosResponse<T>>
): Promise<ApiCallResult<T>> {
  try {
    const res = await request;

    return {
      ok: true,
      body: res.data,
    };
  } catch (err: any) {
    console.error("[Axios] Error at:", url, err);

    return {
      ok: false,
      body: err?.response?.data ?? null,
    };
  }
}

/**
 * ================================
 * 🔹 COMPLETE REMINDER
 * ================================
 */

export async function completeReminder(
  reminderId: string,
  payload?: {
    occurrenceId?: string;
    linkedActivityId?: string;
    autoCreateActivity?: boolean;
  }
): Promise<ApiCallResult<CompleteReminderResponse>> {
  const url = `/api/reminders/${reminderId}/complete`;

  return handleAxios(
    url,
    axios.post<CompleteReminderResponse>(url, payload ?? {})
  );
}

/**
 * ================================
 * 🔹 SNOOZE REMINDER
 * ================================
 */

export async function snoozeReminder(
  reminderId: string,
  payload: { minutes: number; occurrenceId?: string }
): Promise<ApiCallResult> {
  const url = `/api/reminders/${reminderId}/snooze`;

  return handleAxios(url, axios.post(url, payload));
}

/**
 * ================================
 * 🔹 SKIP REMINDER
 * ================================
 */

export async function skipReminder(
  reminderId: string,
  payload?: { occurrenceId?: string }
): Promise<ApiCallResult> {
  const url = `/api/reminders/${reminderId}/skip`;

  return handleAxios(url, axios.post(url, payload ?? {}));
}

/**
 * ================================
 * 🔹 RESCHEDULE REMINDER
 * ================================
 */

export async function rescheduleReminder(
  reminderId: string,
  payload: { remindAt: string; occurrenceId?: string }
): Promise<ApiCallResult> {
  const url = `/api/reminders/${reminderId}/reschedule`;

  return handleAxios(url, axios.post(url, payload));
}

/**
 * ================================
 * 🔹 UPDATE REMINDER STATUS
 * ================================
 */

export async function updateReminderStatus(
  reminderId: string,
  status: ReminderStatus
): Promise<ApiCallResult> {
  const url = `/api/reminders/${reminderId}`;

  return handleAxios(url, axios.patch(url, { status }));
}

/**
 * ================================
 * 🔹 DELETE REMINDER
 * ================================
 */

export async function deleteReminder(
  reminderId: string
): Promise<ApiCallResult> {
  const url = `/api/reminders/${reminderId}`;

  return handleAxios(url, axios.delete(url));
}