ALTER TABLE "notification_logs" ADD COLUMN "occurrence_id" uuid;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "scheduled_for" timestamp;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "action_url" text;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "severity" text;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "schedule_type" "reminder_schedule_type" DEFAULT 'one-time' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "repeat_interval_minutes" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "end_after_occurrences" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "end_at" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "auto_complete_on_activity" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "allow_snooze" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "max_snoozes" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "adaptive_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "status" "reminder_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "priority" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "updated_at" timestamp DEFAULT now();
