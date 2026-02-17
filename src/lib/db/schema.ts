import "server-only";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

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

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =========================
   BABIES (owned by one user)
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

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* Index */
//export const babiesUserIdx = index("babies_user_idx")
  //.on(babies.userId)
  //.using("btree");

/* =========================
   ACTIVITY TYPES
========================= */

export const activityTypes = pgTable("activity_types", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),

  isSystem: boolean("is_system").default(false),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

/* Unique index to prevent duplicates */
/*export const activityTypesNameUnique = uniqueIndex(
  "activity_types_name_unique"
).on(activityTypes.name);*/

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

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* Indexes */
/* export const activitiesBabyIdx = index("activities_baby_idx")
  .on(activities.babyId);

export const activitiesStartIdx = index("activities_start_idx")
  .on(activities.startTime);

export const activitiesTypeIdx = index("activities_type_idx")
  .on(activities.activityTypeId);*/

/* =========================
   REMINDERS
========================= */

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),

  babyId: uuid("baby_id")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),

  activityTypeId: uuid("activity_type_id")
    .references(() => activityTypes.id, { onDelete: "set null" }),

  title: text("title"),

  cronExpression: text("cron_expression").notNull(),
  nextRun: timestamp("next_run", { mode: "date" }),

  isActive: boolean("is_active").default(true),

  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

/* Indexes */
/*export const remindersNextRunIdx = index("reminders_next_run_idx")
  .on(reminders.nextRun);

export const remindersBabyIdx = index("reminders_baby_idx")
  .on(reminders.babyId);*/

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

  status: text("status"),
  errorMessage: text("error_message"),

  sentAt: timestamp("sent_at", { mode: "date" }).defaultNow(),
});

/* Indexes */
/*export const notificationLogsUserIdx = index(
  "notification_logs_user_idx"
).on(notificationLogs.userId);

export const notificationLogsReminderIdx = index(
  "notification_logs_reminder_idx"
).on(notificationLogs.reminderId);*/

