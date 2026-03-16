
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const reminderScheduleTypeEnum = pgEnum(
  "reminder_schedule_type",
  ["one-time", "recurring", "interval"]
);

export const reminderStatusEnum = pgEnum(
  "reminder_status",
  ["active", "paused", "cancelled"]
);

export const reminderOccurrenceStatusEnum = pgEnum(
  "reminder_occurrence_status",
  ["pending", "completed", "skipped", "expired"]
);

export const reminderActionTypeEnum = pgEnum(
  "reminder_action_type",
  ["created", "completed", "skipped", "snoozed", "rescheduled", "cancelled"]
);

export const notificationStatusEnum = pgEnum(
  "notification_status",
  ["queued", "sent", "failed", "retrying", "permanently_failed"]
);

/* =========================
   USERS
========================= */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  emailVerified: boolean("email_verified").default(false),
  avatarUrl: text("avatar_url"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =========================
   BABIES
========================= */

export const babies = pgTable("babies", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  birthDate: date("birth_date"),
  gender: text("gender"),

  photoUrl: text("photo_url"),
  timezone: text("timezone").default("UTC"),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =========================
   ACTIVITY TYPES
========================= */

export const activityTypes = pgTable("activity_types", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),

  icon: text("icon"),
  color: text("color"),

  isSystem: boolean("is_system").default(false),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* =========================
   ACTIVITIES
========================= */

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),

  babyId: uuid("baby_id")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),

  activityTypeId: uuid("activity_type_id")
    .notNull()
    .references(() => activityTypes.id, { onDelete: "restrict" }),

  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }),

  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  metadata: jsonb("metadata"),

  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =========================
   REMINDERS (Definition Layer)
========================= */

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),

    activityTypeId: uuid("activity_type_id")
      .references(() => activityTypes.id, { onDelete: "set null" }),

    title: text("title"),
    description: text("description"),

    scheduleType: reminderScheduleTypeEnum("schedule_type")
      .notNull()
      .default("one-time"), // one-time | recurring | interval

    remindAt: timestamp("remind_at", { mode: "date" }).notNull(),

    cronExpression: text("cron_expression"),
    repeatIntervalMinutes: integer("repeat_interval_minutes"),

    endAfterOccurrences: integer("end_after_occurrences"),
    endAt: timestamp("end_at", { mode: "date" }),

    autoCompleteOnActivity: boolean("auto_complete_on_activity").default(false),
    allowSnooze: boolean("allow_snooze").default(true),
    maxSnoozes: integer("max_snoozes"),
    adaptiveEnabled: boolean("adaptive_enabled").default(false),

    status: reminderStatusEnum("status")
      .notNull()
      .default("active"), // active | paused | cancelled

    priority: integer("priority").default(0),
    tags: jsonb("tags"),

    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    reminderActiveIdx: index("reminder_active_idx")
      .on(table.babyId, table.status),
  })
);

/* =========================
   REMINDER OCCURRENCES (Execution Layer)
========================= */

export const reminderOccurrences = pgTable(
  "reminder_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => reminders.id, { onDelete: "cascade" }),

    scheduledFor: timestamp("scheduled_for", { mode: "date" }).notNull(),

    status: reminderOccurrenceStatusEnum("status")
      .notNull()
      .default("pending"), // pending | completed | skipped | expired

    snoozeUntil: timestamp("snooze_until", { mode: "date" }),
    snoozedCount: integer("snoozed_count").default(0),

    completedAt: timestamp("completed_at", { mode: "date" }),

    linkedActivityId: uuid("linked_activity_id")
      .references(() => activities.id, { onDelete: "set null" }),

    triggeredAt: timestamp("triggered_at", { mode: "date" }),
    notificationSentAt: timestamp("notification_sent_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    occurrenceDueIdx: index("occurrence_due_idx")
      .on(table.status, table.scheduledFor),

    occurrenceReminderIdx: index("occurrence_reminder_idx")
      .on(table.reminderId),

    occurrenceUniqueIdx: uniqueIndex("occurrence_unique_idx")
      .on(table.reminderId, table.scheduledFor),
  })
);

/* =========================
   REMINDER ACTION LOGS
========================= */

export const reminderActionLogs = pgTable("reminder_action_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  reminderId: uuid("reminder_id")
    .notNull()
    .references(() => reminders.id, { onDelete: "cascade" }),

  occurrenceId: uuid("occurrence_id")
    .references(() => reminderOccurrences.id, { onDelete: "cascade" }),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),

  actionType: reminderActionTypeEnum("action_type").notNull(),
  // created | completed | skipped | snoozed | rescheduled | cancelled

  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* =========================
   NOTIFICATION LOGS
========================= */

export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),

  reminderId: uuid("reminder_id")
    .notNull()
    .references(() => reminders.id, { onDelete: "cascade" }),

  occurrenceId: uuid("occurrence_id")
    .references(() => reminderOccurrences.id, { onDelete: "set null" }),

  title: text("title"),
  scheduledFor: timestamp("scheduled_for", { mode: "date" }),
  actionUrl: text("action_url"),
  severity: text("severity"),
  readAt: timestamp("read_at", { mode: "date" }),

  status: notificationStatusEnum("status").default("queued"),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),

  sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
});

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),

    activityId: uuid("activity_id")
      .references(() => activities.id, { onDelete: "set null" }),

    insightKey: text("insight_key").notNull(),

    category: text("category").notNull(),

    severity: text("severity").notNull(),

    title: text("title").notNull(),

    message: text("message").notNull(),

    actionLabel: text("action_label"),

    actionUrl: text("action_url"),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    expiredAt: timestamp("expired_at", { mode: "date" }),
  },
  (table) => ({
    insightBabyIdx: index("insight_baby_idx")
      .on(table.babyId),

    insightKeyIdx: uniqueIndex("insight_key_unique")
      .on(table.babyId, table.insightKey),
  })
);
