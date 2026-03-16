"use client";

type ApiCallResult = {
  ok: boolean;
  response: Response;
  body: unknown;
};

type ReminderStatus = "active" | "paused" | "cancelled";

async function safeJson(response: Response) {
  return response.json().catch(() => null);
}

async function postReminderAction(
  endpoint: string,
  payload?: Record<string, unknown>
): Promise<ApiCallResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const body = await safeJson(response);
  return { ok: response.ok, response, body };
}

async function patchReminderAction(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<ApiCallResult> {
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(response);
  return { ok: response.ok, response, body };
}

export async function completeReminder(
  reminderId: string,
  payload?: { occurrenceId?: string; linkedActivityId?: string }
) {
  return postReminderAction(`/api/reminders/${reminderId}/complete`, payload);
}

export async function snoozeReminder(
  reminderId: string,
  payload: { minutes: number; occurrenceId?: string }
) {
  return postReminderAction(`/api/reminders/${reminderId}/snooze`, payload);
}

export async function skipReminder(reminderId: string) {
  return postReminderAction(`/api/reminders/${reminderId}/skip`);
}

export async function rescheduleReminder(
  reminderId: string,
  payload: { remindAt: string; occurrenceId?: string }
) {
  return postReminderAction(`/api/reminders/${reminderId}/reschedule`, payload);
}

export async function updateReminderStatus(
  reminderId: string,
  status: ReminderStatus
) {
  return patchReminderAction(`/api/reminders/${reminderId}`, { status });
}

export async function deleteReminder(reminderId: string) {
  const response = await fetch(`/api/reminders/${reminderId}`, {
    method: "DELETE",
  });

  const body = await safeJson(response);
  return { ok: response.ok, response, body };
}
