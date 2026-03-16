-- Step 1: add NOT NULL to created_at fields.
UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "babies" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "activity_types" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "activities" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "reminders" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "reminder_occurrences" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
UPDATE "reminder_action_logs" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "babies" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_types" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminders" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminder_occurrences" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminder_action_logs" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "notification_logs" ALTER COLUMN "sent_at" SET NOT NULL;
--> statement-breakpoint

-- Step 2: convert reminder text columns to enums.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_schedule_type') THEN
    CREATE TYPE "reminder_schedule_type" AS ENUM ('one-time', 'recurring', 'interval');
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_status') THEN
    CREATE TYPE "reminder_status" AS ENUM ('active', 'paused', 'cancelled');
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_occurrence_status') THEN
    CREATE TYPE "reminder_occurrence_status" AS ENUM ('pending', 'completed', 'skipped', 'expired');
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_action_type') THEN
    CREATE TYPE "reminder_action_type" AS ENUM ('created', 'completed', 'skipped', 'snoozed', 'rescheduled', 'cancelled');
  END IF;
END $$;
--> statement-breakpoint

UPDATE "reminders"
SET "schedule_type" = 'one-time'
WHERE "schedule_type" IS NULL
   OR "schedule_type" NOT IN ('one-time', 'recurring', 'interval');
--> statement-breakpoint
UPDATE "reminders"
SET "status" = 'active'
WHERE "status" IS NULL
   OR "status" NOT IN ('active', 'paused', 'cancelled');
--> statement-breakpoint
UPDATE "reminder_occurrences"
SET "status" = 'pending'
WHERE "status" IS NULL
   OR "status" NOT IN ('pending', 'completed', 'skipped', 'expired');
--> statement-breakpoint
UPDATE "reminder_action_logs"
SET "action_type" = 'created'
WHERE "action_type" IS NULL
   OR "action_type" NOT IN ('created', 'completed', 'skipped', 'snoozed', 'rescheduled', 'cancelled');
--> statement-breakpoint

ALTER TABLE "reminders"
ALTER COLUMN "schedule_type" TYPE "reminder_schedule_type"
USING "schedule_type"::"reminder_schedule_type";
--> statement-breakpoint
ALTER TABLE "reminders"
ALTER COLUMN "schedule_type" SET DEFAULT 'one-time';
--> statement-breakpoint

ALTER TABLE "reminders"
ALTER COLUMN "status" TYPE "reminder_status"
USING "status"::"reminder_status";
--> statement-breakpoint
ALTER TABLE "reminders"
ALTER COLUMN "status" SET DEFAULT 'active';
--> statement-breakpoint

ALTER TABLE "reminder_occurrences"
ALTER COLUMN "status" TYPE "reminder_occurrence_status"
USING "status"::"reminder_occurrence_status";
--> statement-breakpoint
ALTER TABLE "reminder_occurrences"
ALTER COLUMN "status" SET DEFAULT 'pending';
--> statement-breakpoint

ALTER TABLE "reminder_action_logs"
ALTER COLUMN "action_type" TYPE "reminder_action_type"
USING "action_type"::"reminder_action_type";
--> statement-breakpoint
