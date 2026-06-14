ALTER TABLE "instances" ALTER COLUMN "started_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "started_at" SET NOT NULL;