CREATE TYPE "public"."project_automation_run_source" AS ENUM('manual', 'webhook', 'schedule');--> statement-breakpoint
CREATE TYPE "public"."project_automation_run_status" AS ENUM('queued', 'working', 'allocating', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_automation_trigger_providers" AS ENUM('sentry', 'custom');--> statement-breakpoint
CREATE TABLE "project_automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_automation_id" uuid,
	"project_automation_trigger_id" uuid,
	"provider" "project_automation_trigger_providers",
	"project_request_unique_id" varchar,
	"source" "project_automation_run_source" NOT NULL,
	"status" "project_automation_run_status" DEFAULT 'queued' NOT NULL,
	"input" text,
	"error" text,
	"project_session_id" uuid,
	"user_feedback" varchar,
	"user_rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_automation_runs_project_session_id_unique" UNIQUE("project_session_id"),
	CONSTRAINT "project_automation_runs_trigger_project_request_unique_id_unique" UNIQUE("project_automation_trigger_id","provider","project_request_unique_id"),
	CONSTRAINT "rating_range_check" CHECK ("project_automation_runs"."user_rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "project_automation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_automation_id" uuid,
	"path_from_code" varchar NOT NULL,
	"task_prompt" text NOT NULL,
	"agent" "project_session_task_agents" NOT NULL,
	"order_number" integer NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_automation_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"project_automation_id" uuid,
	"webhook_secret" varchar NOT NULL,
	"provider" "project_automation_trigger_providers" NOT NULL,
	"deleted_at" timestamp,
	"lasted_triggered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"user_id" uuid,
	"project_id" uuid NOT NULL,
	"last_run_at" timestamp DEFAULT now() NOT NULL,
	"next_run_at" timestamp DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"cron_expression" varchar,
	"timezone" varchar,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "project_automation_runs" ADD CONSTRAINT "project_automation_runs_project_automation_id_project_automations_id_fk" FOREIGN KEY ("project_automation_id") REFERENCES "public"."project_automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automation_runs" ADD CONSTRAINT "project_automation_runs_project_automation_trigger_id_project_automation_triggers_id_fk" FOREIGN KEY ("project_automation_trigger_id") REFERENCES "public"."project_automation_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automation_runs" ADD CONSTRAINT "project_automation_runs_project_session_id_project_session_id_fk" FOREIGN KEY ("project_session_id") REFERENCES "public"."project_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automation_tasks" ADD CONSTRAINT "project_automation_tasks_project_automation_id_project_automations_id_fk" FOREIGN KEY ("project_automation_id") REFERENCES "public"."project_automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automation_triggers" ADD CONSTRAINT "project_automation_triggers_project_automation_id_project_automations_id_fk" FOREIGN KEY ("project_automation_id") REFERENCES "public"."project_automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automations" ADD CONSTRAINT "project_automations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_automations" ADD CONSTRAINT "project_automations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;