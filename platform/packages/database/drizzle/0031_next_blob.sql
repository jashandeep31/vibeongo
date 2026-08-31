ALTER TYPE "public"."instance_slot_instace_category" RENAME TO " instance_slot_instance_category";--> statement-breakpoint
ALTER TABLE "instance_slots" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."instance_slot_status";--> statement-breakpoint
CREATE TYPE "public"."instance_slot_status" AS ENUM('queued', 'provisioning', 'active', 'failed', 'terminating', 'terminated', 'cancelled', 'expired');--> statement-breakpoint
ALTER TABLE "instance_slots" ALTER COLUMN "status" SET DATA TYPE "public"."instance_slot_status" USING "status"::"public"."instance_slot_status";--> statement-breakpoint
ALTER TABLE "instance_slots" ALTER COLUMN "session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "instance_id" uuid;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "runtime_kind" "instance_runtime_kind" NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "instance_type_id" uuid;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "sandbox_type_id" uuid;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "assign_domains" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD COLUMN "spined_up_by" varchar;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_instance_type_id_instance_types_id_fk" FOREIGN KEY ("instance_type_id") REFERENCES "public"."instance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_instance_id_unique" UNIQUE("instance_id");