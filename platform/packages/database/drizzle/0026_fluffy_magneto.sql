CREATE TYPE "public"."instance_slot_instace_category" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."instance_slot_status" AS ENUM('queued', 'active', 'temrinated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_tiers" AS ENUM('tier1', 'tier2', 'tier3');--> statement-breakpoint
CREATE TABLE "instance_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"category" "instance_slot_instace_category" NOT NULL,
	"status" "instance_slot_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" "user_tiers" DEFAULT 'tier1' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_session_id_project_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_session"("id") ON DELETE cascade ON UPDATE no action;