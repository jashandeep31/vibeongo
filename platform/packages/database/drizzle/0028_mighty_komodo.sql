CREATE TYPE "public"."git_repo_type" AS ENUM('github', 'forgejo');--> statement-breakpoint
ALTER TABLE "instance_openrouter_keys" DROP CONSTRAINT "instance_openrouter_keys_instance_id_unique";--> statement-breakpoint
ALTER TABLE "git_repos" ADD COLUMN "type" "git_repo_type" DEFAULT 'github';