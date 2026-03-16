CREATE TABLE IF NOT EXISTS "insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "baby_id" uuid NOT NULL,
  "activity_id" uuid,
  "insight_key" text NOT NULL,
  "category" text NOT NULL,
  "severity" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "action_label" text,
  "action_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insights_baby_id_babies_id_fk'
  ) THEN
    ALTER TABLE "insights" ADD CONSTRAINT "insights_baby_id_babies_id_fk"
      FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insights_activity_id_activities_id_fk'
  ) THEN
    ALTER TABLE "insights" ADD CONSTRAINT "insights_activity_id_activities_id_fk"
      FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insight_baby_idx" ON "insights" USING btree ("baby_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "insight_key_unique" ON "insights" USING btree ("baby_id","insight_key");
