-- Same indexes as 0013_occurrence_perf_indexes.sql; IF NOT EXISTS avoids failures when 0013 already ran.
CREATE INDEX IF NOT EXISTS "activity_baby_start_idx" ON "activities" USING btree ("baby_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_baby_type_start_idx" ON "activities" USING btree ("baby_id","activity_type_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_baby_idx" ON "reminders" USING btree ("baby_id");