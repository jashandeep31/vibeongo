CREATE TYPE "public"."instance_runtime_kind" AS ENUM('vm', 'sandbox');--> statement-breakpoint
CREATE TYPE "public"."git_repo_overview_jobs_status_enum" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sandbox_providers" AS ENUM('e2b');--> statement-breakpoint
CREATE TABLE "git_repo_overview_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repoId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"status" "git_repo_overview_jobs_status_enum" DEFAULT 'pending' NOT NULL,
	"error" varchar DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sandbox_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"provider" "sandbox_providers" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sandbox_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"cpu" text,
	"ram" text,
	"provider" "sandbox_providers" NOT NULL,
	"sandbox_region" uuid,
	"price_per_seconds" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "github_repos" ADD COLUMN "overview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instances" ADD COLUMN "runtime_kind" "instance_runtime_kind" DEFAULT 'vm' NOT NULL;--> statement-breakpoint
ALTER TABLE "instances" ADD COLUMN "sandbox_type_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "sandbox_type_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "overview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" ADD CONSTRAINT "git_repo_overview_jobs_repoId_github_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."github_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" ADD CONSTRAINT "git_repo_overview_jobs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_types" ADD CONSTRAINT "sandbox_types_sandbox_region_sandbox_regions_id_fk" FOREIGN KEY ("sandbox_region") REFERENCES "public"."sandbox_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_exactly_one_runtime_type" CHECK (
        (
          "instances"."runtime_kind" = 'vm'
          AND "instances"."instance_type_id" IS NOT NULL
          AND "instances"."sandbox_type_id" IS NULL
        )
        OR
        (
          "instances"."runtime_kind" = 'sandbox'
          AND "instances"."sandbox_type_id" IS NOT NULL
          AND "instances"."instance_type_id" IS NULL
        )
      );