CREATE TYPE "public"."instance_period_kind" AS ENUM('running', 'suspended');--> statement-breakpoint
ALTER TYPE "public"."instance_slot_status" ADD VALUE 'suspended';--> statement-breakpoint
ALTER TYPE "public"."instance_state" ADD VALUE 'suspended';--> statement-breakpoint
CREATE TABLE "instance_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"kind" "instance_period_kind" NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"rate_per_second" bigint NOT NULL,
	"compute_amount" bigint DEFAULT 0 NOT NULL,
	"ai_amount" bigint DEFAULT 0 NOT NULL,
	"network_amount" bigint DEFAULT 0 NOT NULL,
	"network_out_gb" double precision DEFAULT 0 NOT NULL,
	"storage_amount" bigint DEFAULT 0 NOT NULL,
	"amount" bigint,
	"charged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instance_periods_ended_after_started" CHECK ("instance_periods"."ended_at" IS NULL OR "instance_periods"."ended_at" >= "instance_periods"."started_at")
);
--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "cpu" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "cpu" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "cpu" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "ram" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "ram" SET DEFAULT 8;--> statement-breakpoint
ALTER TABLE "instance_types" ALTER COLUMN "ram" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "cpu" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "cpu" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "cpu" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "ram" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "ram" SET DEFAULT 8;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "ram" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_types" ADD COLUMN "storage" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "sandbox_types" ADD COLUMN "storage" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_periods" ADD CONSTRAINT "instance_periods_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instance_periods_instance_id_idx" ON "instance_periods" USING btree ("instance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instance_periods_one_open_per_instance" ON "instance_periods" USING btree ("instance_id") WHERE "instance_periods"."ended_at" IS NULL;--> statement-breakpoint
ALTER TABLE "instances" DROP COLUMN "session_cost";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "total_charges";