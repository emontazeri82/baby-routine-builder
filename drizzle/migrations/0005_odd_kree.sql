CREATE INDEX "reminders_baby_active_idx" ON "reminders" USING btree ("baby_id","is_active");--> statement-breakpoint
CREATE INDEX "reminders_completed_idx" ON "reminders" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "reminders_next_run_idx" ON "reminders" USING btree ("next_run");