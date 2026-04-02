export type ActionResult<T = unknown> = {
  ok: boolean;
  body: T;
};

export type CompleteReminderResponse = {
  success: boolean;
  occurrence: unknown;
  activityCreated: boolean;
};