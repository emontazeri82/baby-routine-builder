ALTER TABLE "reminders" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "is_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "linked_activity_id" uuid;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "is_skipped" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "snoozed_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "last_snoozed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_linked_activity_id_activities_id_fk" FOREIGN KEY ("linked_activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;