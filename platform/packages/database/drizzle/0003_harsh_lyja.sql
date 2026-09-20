CREATE TABLE "automation_schedule_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_run_id" uuid NOT NULL,
	"delivered_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "automation_schedule_outbox_automation_run_id_unique" UNIQUE("automation_run_id")
);
--> statement-breakpoint
ALTER TABLE "project_automations" ALTER COLUMN "last_run_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_automations" ALTER COLUMN "last_run_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_automations" ALTER COLUMN "next_run_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_automations" ALTER COLUMN "next_run_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_automation_runs" ADD COLUMN "scheduled_for" timestamp;--> statement-breakpoint
ALTER TABLE "automation_schedule_outbox" ADD CONSTRAINT "automation_schedule_outbox_automation_run_id_project_automation_runs_id_fk" FOREIGN KEY ("automation_run_id") REFERENCES "public"."project_automation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automation_runs" ADD CONSTRAINT "project_automation_runs_automation_scheduled_for_unique" UNIQUE("project_automation_id","scheduled_for");