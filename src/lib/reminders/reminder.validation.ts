// reminders/reminder.validation
import { z } from "zod";
import { scheduleTypes, reminderStatuses } from "./reminder.constants";
export const scheduleMetadataSchema = z.object({
  type: z.enum(["daily", "weekly", "custom", "interval"]),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  intervalMinutes: z.number().int().positive().optional(),
});

function getNowAsWallClockDate(timezone?: string) {
  if (!timezone) return new Date();

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? "0");

    return new Date(
      Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second")
      )
    );
  } catch {
    return new Date();
  }
}

export const createReminderInputSchema = z
  .object({
    babyId: z.string().uuid(),
    reminderMode: z.enum(["activity", "simple"]).default("activity"),
    scheduleType: z.enum(scheduleTypes),
    remindAt: z.coerce.date(),
    timezone: z.string().optional(),
    status: z.enum(reminderStatuses).default("active"),

    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    cronExpression: z.string().trim().min(1).max(255).optional(),
    scheduleMetadata: scheduleMetadataSchema.optional(),
    repeatIntervalMinutes: z.number().int().positive().optional(),
    adaptiveEnabled: z.boolean().optional(),
    allowSnooze: z.boolean().optional(),
    maxSnoozes: z.number().int().min(0).optional(),
    priority: z.number().int().min(1).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).optional(),
    activityTypeId: z.string().uuid().optional(),
    activityTypeSlug: z.string().trim().min(1).max(64).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.remindAt < getNowAsWallClockDate(value.timezone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remind time must be in the future.",
        path: ["remindAt"],
      });
    }

    if (value.scheduleType === "one-time") {
      if (value.cronExpression) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cronExpression is not allowed for one-time reminders",
          path: ["cronExpression"],
        });
      }
      if (value.scheduleMetadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduleMetadata is not required for one-time reminders",
          path: ["scheduleMetadata"],
        });
      }
    }

    if (value.scheduleType === "recurring") {
      if (!value.cronExpression) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cronExpression is required for recurring reminders",
          path: ["cronExpression"],
        });
      }
      if (!value.scheduleMetadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduleMetadata is required for recurring reminders",
          path: ["scheduleMetadata"],
        });
      }
    }

    if (value.scheduleType === "interval" && !value.repeatIntervalMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "repeatIntervalMinutes is required for interval reminders",
        path: ["repeatIntervalMinutes"],
      });
    }

    if (value.allowSnooze === false && value.maxSnoozes !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxSnoozes should not be sent when snooze is disabled",
        path: ["maxSnoozes"],
      });
    }

    if (
      value.reminderMode === "activity" &&
      !value.activityTypeId &&
      !value.activityTypeSlug
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Activity type is required for activity reminders",
        path: ["activityTypeId"],
      });
    }
  });

export const updateReminderInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    remindAt: z.coerce.date().optional(),
    scheduleType: z.enum(scheduleTypes).optional(),
    status: z.enum(reminderStatuses).optional(),
    cronExpression: z.string().trim().max(255).optional().nullable(),
    repeatIntervalMinutes: z.number().int().positive().optional().nullable(),
    adaptiveEnabled: z.boolean().optional(),
    allowSnooze: z.boolean().optional(),
    maxSnoozes: z.number().int().min(0).optional().nullable(),
    priority: z.number().int().min(1).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).optional().nullable(),
    scheduleMetadata: scheduleMetadataSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const snoozeInputSchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60).default(15),
  occurrenceId: z.string().uuid().optional(),
});

export const rescheduleInputSchema = z.object({
  remindAt: z.coerce.date(),
  timezone: z.string().optional(),
  occurrenceId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (value.remindAt <= getNowAsWallClockDate(value.timezone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reschedule time must be in the future.",
      path: ["remindAt"],
    });
  }
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;
