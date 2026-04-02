ALTER TABLE "reminder_occurrences" ADD COLUMN "baby_id" uuid;
--> statement-breakpoint
UPDATE "reminder_occurrences" ro
SET "baby_id" = r."baby_id"
FROM "reminders" r
WHERE ro."reminder_id" = r."id"
  AND ro."baby_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "reminder_occurrences"
  ADD CONSTRAINT "occurrence_baby_fk"
  FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_reminder_occurrence_baby_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.baby_id IS NULL THEN
    SELECT baby_id INTO NEW.baby_id
    FROM reminders
    WHERE id = NEW.reminder_id;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS reminder_occurrence_set_baby_id_trg ON reminder_occurrences;
--> statement-breakpoint
CREATE TRIGGER reminder_occurrence_set_baby_id_trg
BEFORE INSERT OR UPDATE OF reminder_id, baby_id
ON reminder_occurrences
FOR EACH ROW
EXECUTE FUNCTION set_reminder_occurrence_baby_id();
--> statement-breakpoint
ALTER TABLE "reminder_occurrences"
  ALTER COLUMN "baby_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occurrence_baby_scheduled_idx"
  ON "reminder_occurrences" ("baby_id", "scheduled_for");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_baby_start_idx"
  ON "activities" ("baby_id", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_baby_type_start_idx"
  ON "activities" ("baby_id", "activity_type_id", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_baby_idx"
  ON "reminders" ("baby_id");
