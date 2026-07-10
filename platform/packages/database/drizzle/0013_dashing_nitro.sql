ALTER TYPE "public"."instance_providers" ADD VALUE 'digitalocean';--> statement-breakpoint
ALTER TABLE "instances" RENAME COLUMN "aws_instance_id" TO "provider_instance_id";