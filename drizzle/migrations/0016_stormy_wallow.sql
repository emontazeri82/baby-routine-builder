CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"in_app_notifications_enabled" boolean DEFAULT true NOT NULL,
	"email_reminders_enabled" boolean DEFAULT false NOT NULL,
	"email_reminder_lead_minutes" integer DEFAULT 0 NOT NULL,
	"weekly_summary_enabled" boolean DEFAULT true NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"push_notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"marketing_emails_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_preference_user_unique" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notifications_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "dark_mode";