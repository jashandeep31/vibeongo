ALTER TABLE "github_repo_members" RENAME TO "git_repo_members";--> statement-breakpoint
ALTER TABLE "github_repos" RENAME TO "git_repos";--> statement-breakpoint
ALTER TABLE "project_github_repos" RENAME TO "project_git_repos";--> statement-breakpoint
ALTER TABLE "git_repo_members" DROP CONSTRAINT "github_repo_members_username_repo_id_unique";--> statement-breakpoint
ALTER TABLE "git_repos" DROP CONSTRAINT "github_repos_default_project_id_unique";--> statement-breakpoint
ALTER TABLE "git_repos" DROP CONSTRAINT "github_repos_user_id_full_name_unique";--> statement-breakpoint
ALTER TABLE "git_repo_members" DROP CONSTRAINT "github_repo_members_repo_id_github_repos_id_fk";
--> statement-breakpoint
ALTER TABLE "git_repos" DROP CONSTRAINT "github_repos_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "git_repos" DROP CONSTRAINT "github_repos_default_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" DROP CONSTRAINT "git_repo_overview_jobs_repoId_github_repos_id_fk";
--> statement-breakpoint
ALTER TABLE "project_git_repos" DROP CONSTRAINT "project_github_repos_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_git_repos" DROP CONSTRAINT "project_github_repos_github_repo_id_github_repos_id_fk";
--> statement-breakpoint
ALTER TABLE "git_repo_members" ADD CONSTRAINT "git_repo_members_repo_id_git_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_default_project_id_projects_id_fk" FOREIGN KEY ("default_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" ADD CONSTRAINT "git_repo_overview_jobs_repoId_git_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_git_repos" ADD CONSTRAINT "project_git_repos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_git_repos" ADD CONSTRAINT "project_git_repos_github_repo_id_git_repos_id_fk" FOREIGN KEY ("github_repo_id") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_members" ADD CONSTRAINT "git_repo_members_username_repo_id_unique" UNIQUE("username","repo_id");--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_default_project_id_unique" UNIQUE("default_project_id");--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_user_id_full_name_unique" UNIQUE("user_id","full_name");