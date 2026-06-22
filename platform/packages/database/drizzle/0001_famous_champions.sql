ALTER TABLE "project_session_tasks" ALTER COLUMN "agent" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."project_session_task_agents";--> statement-breakpoint
CREATE TYPE "public"."project_session_task_agents" AS ENUM('build', 'plan', 'issue-resolver', 'pr-reviewer');--> statement-breakpoint
ALTER TABLE "project_session_tasks" ALTER COLUMN "agent" SET DATA TYPE "public"."project_session_task_agents" USING "agent"::"public"."project_session_task_agents";--> statement-breakpoint
ALTER TABLE "instance_regions" ADD COLUMN "ami" varchar DEFAULT ' ' NOT NULL;