CREATE TABLE "github_repo_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"username" varchar NOT NULL,
	"can_trigger_pull_request" boolean DEFAULT false NOT NULL,
	"can_trigger_issue" boolean DEFAULT false NOT NULL,
	"can_trigger_comment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "github_repo_members_username_repo_id_unique" UNIQUE("username","repo_id")
);
--> statement-breakpoint
ALTER TABLE "github_repos" ADD COLUMN "auto_review_pull_requests_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "github_repos" ADD COLUMN "auto_fix_issues_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "github_repo_members" ADD CONSTRAINT "github_repo_members_repo_id_github_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."github_repos"("id") ON DELETE cascade ON UPDATE no action;