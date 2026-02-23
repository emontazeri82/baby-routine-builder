CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"activity_type_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"color" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "activity_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "babies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"birth_date" date,
	"gender" text,
	"photo_url" text,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"reminder_id" uuid NOT NULL,
	"status" text,
	"error_message" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"activity_type_id" uuid,
	"title" text,
	"cron_expression" text,
	"next_run" timestamp,
	"remind_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"avatar_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "babies" ADD CONSTRAINT "babies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;