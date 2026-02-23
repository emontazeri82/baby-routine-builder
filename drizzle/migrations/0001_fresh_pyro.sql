ALTER TABLE "activity_types" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_slug_unique" UNIQUE("slug");