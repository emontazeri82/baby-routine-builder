-- Replace old reminder subsystem with enhanced reminder engine.
-- This migration only touches reminder-related tables/indexes.

-- 1) Drop old reminder-related indexes (idempotent / safe).
DROP INDEX IF EXISTS "reminders_baby_active_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "reminders_completed_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "reminders_next_run_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "reminder_active_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "occurrence_due_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "occurrence_reminder_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "occurrence_unique_idx";
--> statement-breakpoint

-- 2) Drop old reminder subsystem tables (only).
DROP TABLE IF EXISTS "notification_logs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "reminder_action_logs" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "reminder_occurrences" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "reminders" CASCADE;
--> statement-breakpoint

-- 3) Create new reminders table (definition layer).
CREATE TABLE "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "baby_id" uuid NOT NULL,
  "activity_type_id" uuid,
  "title" text,
  "description" text,
  "schedule_type" text DEFAULT 'one-time' NOT NULL,
  "remind_at" timestamp NOT NULL,
  "cron_expression" text,
  "repeat_interval_minutes" integer,
  "end_after_occurrences" integer,
  "end_at" timestamp,
  "auto_complete_on_activity" boolean DEFAULT false,
  "allow_snooze" boolean DEFAULT true,
  "max_snoozes" integer,
  "adaptive_enabled" boolean DEFAULT false,
  "status" text DEFAULT 'active' NOT NULL,
  "priority" integer DEFAULT 0,
  "tags" jsonb,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_baby_id_babies_id_fk"
  FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_activity_type_id_activity_types_id_fk"
  FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reminder_active_idx"
  ON "reminders" USING btree ("baby_id","status");
--> statement-breakpoint

-- 4) Create reminder_occurrences table (execution layer).
CREATE TABLE "reminder_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reminder_id" uuid NOT NULL,
  "scheduled_for" timestamp NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "snooze_until" timestamp,
  "snoozed_count" integer DEFAULT 0,
  "completed_at" timestamp,
  "linked_activity_id" uuid,
  "triggered_at" timestamp,
  "notification_sent_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reminder_occurrences" ADD CONSTRAINT "reminder_occurrences_reminder_id_reminders_id_fk"
  FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminder_occurrences" ADD CONSTRAINT "reminder_occurrences_linked_activity_id_activities_id_fk"
  FOREIGN KEY ("linked_activity_id") REFERENCES "public"."activities"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "occurrence_due_idx"
  ON "reminder_occurrences" USING btree ("status","scheduled_for");
--> statement-breakpoint
CREATE INDEX "occurrence_reminder_idx"
  ON "reminder_occurrences" USING btree ("reminder_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "occurrence_unique_idx"
  ON "reminder_occurrences" USING btree ("reminder_id","scheduled_for");
--> statement-breakpoint

-- 5) Create reminder_action_logs table (audit layer).
CREATE TABLE "reminder_action_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reminder_id" uuid NOT NULL,
  "occurrence_id" uuid,
  "user_id" uuid,
  "action_type" text NOT NULL,
  "previous_value" jsonb,
  "new_value" jsonb,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reminder_action_logs" ADD CONSTRAINT "reminder_action_logs_reminder_id_reminders_id_fk"
  FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminder_action_logs" ADD CONSTRAINT "reminder_action_logs_occurrence_id_reminder_occurrences_id_fk"
  FOREIGN KEY ("occurrence_id") REFERENCES "public"."reminder_occurrences"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reminder_action_logs" ADD CONSTRAINT "reminder_action_logs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 6) Create notification_logs table (delivery tracking).
CREATE TABLE "notification_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "reminder_id" uuid NOT NULL,
  "status" text,
  "error_message" text,
  "sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_reminder_id_reminders_id_fk"
  FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id")
  ON DELETE cascade ON UPDATE no action;
