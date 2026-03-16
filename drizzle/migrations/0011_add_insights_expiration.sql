ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "expired_at" timestamp;
