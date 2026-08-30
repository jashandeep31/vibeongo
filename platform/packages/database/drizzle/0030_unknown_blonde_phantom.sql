ALTER TABLE "instance_types" ADD COLUMN "enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "sandbox_types" ADD COLUMN "enabled" boolean DEFAULT true;