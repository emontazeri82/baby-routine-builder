DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE "notification_status" AS ENUM ('queued', 'sent', 'failed', 'retrying', 'permanently_failed');
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "occurrence_id" uuid;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_logs_occurrence_id_reminder_occurrences_id_fk'
  ) THEN
    ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_occurrence_id_reminder_occurrences_id_fk"
    FOREIGN KEY ("occurrence_id") REFERENCES "public"."reminder_occurrences"("id")
    ON DELETE set null;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "scheduled_for" timestamp;
--> statement-breakpoint
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "action_url" text;
--> statement-breakpoint
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "severity" text;
--> statement-breakpoint
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "read_at" timestamp;
--> statement-breakpoint
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0;
--> statement-breakpoint

UPDATE "notification_logs"
SET "attempts" = 0
WHERE "attempts" IS NULL;
--> statement-breakpoint

ALTER TABLE "notification_logs"
ALTER COLUMN "attempts" SET NOT NULL;
--> statement-breakpoint

UPDATE "notification_logs"
SET "status" = 'queued'
WHERE "status" IS NULL
   OR "status" NOT IN ('queued', 'sent', 'failed', 'retrying', 'permanently_failed');
--> statement-breakpoint

ALTER TABLE "notification_logs"
ALTER COLUMN "status" TYPE "notification_status"
USING "status"::"notification_status";
--> statement-breakpoint

ALTER TABLE "notification_logs"
ALTER COLUMN "status" SET DEFAULT 'queued';
