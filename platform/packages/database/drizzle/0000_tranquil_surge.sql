CREATE TYPE "public"."chat_agent_enum" AS ENUM('project-handler', 'tasks-maker', 'vibeongo-agent');--> statement-breakpoint
CREATE TYPE "public"."git_provider" AS ENUM('github', 'forgejo');--> statement-breakpoint
CREATE TYPE "public"."git_repo_type" AS ENUM('github', 'forgejo');--> statement-breakpoint
CREATE TYPE "public"."instance_providers" AS ENUM('aws', 'digitalocean');--> statement-breakpoint
CREATE TYPE "public"."instance_runtime_kind" AS ENUM('vm', 'sandbox');--> statement-breakpoint
CREATE TYPE "public"." instance_slot_instance_category" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."instance_slot_status" AS ENUM('queued', 'provisioning', 'active', 'failed', 'terminating', 'terminated', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."instance_state" AS ENUM('running', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."git_repo_overview_jobs_status_enum" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_session_task_agents" AS ENUM('build', 'plan', 'issue-resolver', 'pr-reviewer');--> statement-breakpoint
CREATE TYPE "public"."project_session_category" AS ENUM('manual', 'auto');--> statement-breakpoint
CREATE TYPE "public"."sandbox_providers" AS ENUM('e2b', 'vercel', 'daytona');--> statement-breakpoint
CREATE TYPE "public"."telegram_bot_chat_session_message_role" AS ENUM('user', 'bot');--> statement-breakpoint
CREATE TYPE "public"."ec2_status" AS ENUM('running', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway_transaction_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_wallet_transaction_type" AS ENUM('deposit', 'spent', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."account_providers" AS ENUM('github');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'banned', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."user_config_type" AS ENUM('opencode', 'codex', 'pi', 'fx');--> statement-breakpoint
CREATE TYPE "public"."user_login_method_enum" AS ENUM('github');--> statement-breakpoint
CREATE TYPE "public"."users_roles" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_tiers" AS ENUM('tier1', 'tier2', 'tier3');--> statement-breakpoint
CREATE TABLE "chat_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer" text NOT NULL,
	"reasoning" text,
	"finish_reason" text,
	"usage" jsonb,
	"steps" jsonb,
	"memory" text,
	"question_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"payload" jsonb DEFAULT '{"mentions":[]}'::jsonb NOT NULL,
	"chat_id" uuid NOT NULL,
	"order_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_agent" "chat_agent_enum" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"config" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "git_repo_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instance_id" uuid,
	"repo_id" uuid NOT NULL,
	"provider" "git_provider" NOT NULL,
	"provider_token_id" varchar,
	"encrypted_token" text,
	"token_iv" varchar,
	"token_tag" text,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "git_repo_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"username" varchar NOT NULL,
	"can_trigger_pull_request" boolean DEFAULT false NOT NULL,
	"can_trigger_issue" boolean DEFAULT false NOT NULL,
	"can_trigger_comment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "git_repo_members_username_repo_id_unique" UNIQUE("username","repo_id")
);
--> statement-breakpoint
CREATE TABLE "git_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "git_repo_type" DEFAULT 'github',
	"default_project_id" uuid,
	"installation_id" integer NOT NULL,
	"auto_review_pull_requests_enabled" boolean DEFAULT false NOT NULL,
	"auto_fix_issues_enabled" boolean DEFAULT false NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"repo_owner_username" varchar(255) NOT NULL,
	"setup_script" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "git_repos_default_project_id_unique" UNIQUE("default_project_id"),
	CONSTRAINT "git_repos_user_id_full_name_unique" UNIQUE("user_id","full_name")
);
--> statement-breakpoint
CREATE TABLE "instance_openrouter_keys" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid PRIMARY KEY NOT NULL,
	"hash" varchar NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" varchar NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instance_openrouter_keys_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "instance_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"ami" varchar NOT NULL,
	"provider" "instance_providers" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instance_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"cpu" text,
	"ram" text,
	"provider" "instance_providers" NOT NULL,
	"region_id" uuid,
	"price_per_hour" bigint NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instance_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instance_id" uuid,
	"session_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"error" text,
	"category" " instance_slot_instance_category" NOT NULL,
	"runtime_kind" "instance_runtime_kind" NOT NULL,
	"instance_type_id" uuid,
	"sandbox_type_id" uuid,
	"assign_domains" boolean DEFAULT false NOT NULL,
	"spined_up_by" varchar,
	"status" "instance_slot_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instance_slots_instance_id_unique" UNIQUE("instance_id")
);
--> statement-breakpoint
CREATE TABLE "instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar DEFAULT 'instance' NOT NULL,
	"project_id" uuid,
	"user_id" uuid NOT NULL,
	"runtime_kind" "instance_runtime_kind" DEFAULT 'vm' NOT NULL,
	"instance_type_id" uuid,
	"sandbox_type_id" uuid,
	"project_session_id" uuid,
	"terminates_at" timestamp NOT NULL,
	"terminated_at" timestamp,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"state" "instance_state" NOT NULL,
	"session_cost" bigint DEFAULT 0 NOT NULL,
	"config" json DEFAULT '{}' NOT NULL,
	"overview" text,
	"public_ip" varchar,
	"private_ip" varchar,
	"provider_instance_id" varchar NOT NULL,
	"proxy_domain" varchar NOT NULL,
	"access_token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instances_exactly_one_runtime_type" CHECK (
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
      )
);
--> statement-breakpoint
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
CREATE TABLE "project_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"project_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_domain_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"target_instance_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_domain_routing_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "routing_allowed_ips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routing_id" uuid NOT NULL,
	"ip" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "routing_id_ip" UNIQUE("ip","routing_id")
);
--> statement-breakpoint
CREATE TABLE "project_session_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_name" varchar,
	"task" text NOT NULL,
	"agent" "project_session_task_agents" NOT NULL,
	"order_number" integer NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"project_session_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"started_at" timestamp DEFAULT now(),
	"archived" boolean DEFAULT false NOT NULL,
	"category" "project_session_category" DEFAULT 'manual' NOT NULL,
	"user_id" uuid,
	"project_id" uuid NOT NULL,
	"overview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iv" varchar NOT NULL,
	"encrypted_config" text NOT NULL,
	"tag" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_file_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"project_file_id" uuid NOT NULL,
	"encrypted_content" text NOT NULL,
	"iv" varchar NOT NULL,
	"tag" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_file_data_version_project_file_id_unique" UNIQUE("version","project_file_id")
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"name" varchar NOT NULL,
	"path" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_git_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"github_repo_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_ssh_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"ssh_key_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"instance_type_id" uuid NOT NULL,
	"sandbox_type_id" uuid NOT NULL,
	"total_charges" bigint DEFAULT 0 NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"initial_script" text DEFAULT '' NOT NULL,
	"final_script" text DEFAULT '' NOT NULL,
	"dev_script" text DEFAULT '' NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proxy_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar NOT NULL,
	"target_port" integer NOT NULL,
	"routing_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_editable" boolean DEFAULT true NOT NULL,
	"allow_all_ips" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "proxy_domains_domain_unique" UNIQUE("domain")
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
	"enabled" boolean DEFAULT true,
	"provider" "sandbox_providers" NOT NULL,
	"sandbox_region" uuid,
	"price_per_seconds" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shh_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"user_id" uuid,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_bot_chat" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"state" varchar NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "telegram_bot_chat_id_unique" UNIQUE("id"),
	CONSTRAINT "telegram_bot_chat_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_bot_chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_chat_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_bot_chat_session_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"telegram_chat_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "telegram_bot_chat_session_message_role" NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ec2" (
	"id" uuid DEFAULT gen_random_uuid(),
	"ec2_id" varchar NOT NULL,
	"region" varchar NOT NULL,
	"ip" varchar,
	"status" "ec2_status" DEFAULT 'running' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ec2_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"amount" integer NOT NULL,
	"sessionId" varchar,
	"status" "payment_gateway_transaction_status" DEFAULT 'pending',
	"completed_at" timestamp,
	"raw" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_gateway_transactions_sessionId_unique" UNIQUE("sessionId")
);
--> statement-breakpoint
CREATE TABLE "user_credit_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_balance" bigint DEFAULT 0 NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text,
	"wallet_id" uuid,
	"expires_at" timestamp NOT NULL,
	"expired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallet_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_type" "user_wallet_transaction_type" NOT NULL,
	"wallet_id" uuid NOT NULL,
	"description" text NOT NULL,
	"raw_description" text NOT NULL,
	"amount" bigint NOT NULL,
	"user_wallet_credit_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" "account_providers" NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"token" varchar(255) NOT NULL,
	"deleted_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_id_unique" UNIQUE("id"),
	CONSTRAINT "accounts_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "accounts_provider_account_id_unique" UNIQUE("provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "user_configs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"config_type" "user_config_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"iv" varchar NOT NULL,
	"encrypted_config" text NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_configs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "user_login_logs" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"ip_address" varchar,
	"user_agent" varchar,
	"login_method" "user_login_method_enum" DEFAULT 'github',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_login_logs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"default_pr_model" varchar,
	"default_issue_fixer_model" varchar,
	"default_comment_model" varchar,
	"default_model" varchar,
	"telegram_chat_id" bigint,
	"default_issue_instance_auto_terminate_after_minutes" integer DEFAULT 30 NOT NULL,
	"default_pr_instance_auto_terminate_after_minutes" integer DEFAULT 30 NOT NULL,
	"default_manual_instance_auto_terminate_after_minutes" integer DEFAULT 120 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_id_unique" UNIQUE("id"),
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_settings_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"tier" "user_tiers" DEFAULT 'tier1' NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar,
	"role" "users_roles" DEFAULT 'user' NOT NULL,
	"forgejo_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_forgejo_id_unique" UNIQUE("forgejo_id")
);
--> statement-breakpoint
CREATE TABLE "users_api_keys" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"expires_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_api_keys_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "chat_answer" ADD CONSTRAINT "chat_answer_question_id_chat_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."chat_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_questions" ADD CONSTRAINT "chat_questions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_access_tokens" ADD CONSTRAINT "git_repo_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_access_tokens" ADD CONSTRAINT "git_repo_access_tokens_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_access_tokens" ADD CONSTRAINT "git_repo_access_tokens_repo_id_git_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_members" ADD CONSTRAINT "git_repo_members_repo_id_git_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repos" ADD CONSTRAINT "git_repos_default_project_id_projects_id_fk" FOREIGN KEY ("default_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_openrouter_keys" ADD CONSTRAINT "instance_openrouter_keys_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_types" ADD CONSTRAINT "instance_types_region_id_instance_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."instance_regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_session_id_project_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_instance_type_id_instance_types_id_fk" FOREIGN KEY ("instance_type_id") REFERENCES "public"."instance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_slots" ADD CONSTRAINT "instance_slots_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_instance_type_id_instance_types_id_fk" FOREIGN KEY ("instance_type_id") REFERENCES "public"."instance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_project_session_id_project_session_id_fk" FOREIGN KEY ("project_session_id") REFERENCES "public"."project_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" ADD CONSTRAINT "git_repo_overview_jobs_repoId_git_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repo_overview_jobs" ADD CONSTRAINT "git_repo_overview_jobs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_chats" ADD CONSTRAINT "project_chats_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_chats" ADD CONSTRAINT "project_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_domain_routing" ADD CONSTRAINT "project_domain_routing_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_domain_routing" ADD CONSTRAINT "project_domain_routing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_domain_routing" ADD CONSTRAINT "project_domain_routing_target_instance_id_instances_id_fk" FOREIGN KEY ("target_instance_id") REFERENCES "public"."instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_allowed_ips" ADD CONSTRAINT "routing_allowed_ips_routing_id_project_domain_routing_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."project_domain_routing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_session_tasks" ADD CONSTRAINT "project_session_tasks_project_session_id_project_session_id_fk" FOREIGN KEY ("project_session_id") REFERENCES "public"."project_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_session" ADD CONSTRAINT "project_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_session" ADD CONSTRAINT "project_session_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_config" ADD CONSTRAINT "project_config_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_data" ADD CONSTRAINT "project_file_data_project_file_id_project_files_id_fk" FOREIGN KEY ("project_file_id") REFERENCES "public"."project_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_git_repos" ADD CONSTRAINT "project_git_repos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_git_repos" ADD CONSTRAINT "project_git_repos_github_repo_id_git_repos_id_fk" FOREIGN KEY ("github_repo_id") REFERENCES "public"."git_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ssh_keys" ADD CONSTRAINT "project_ssh_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ssh_keys" ADD CONSTRAINT "project_ssh_keys_ssh_key_id_shh_keys_id_fk" FOREIGN KEY ("ssh_key_id") REFERENCES "public"."shh_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_instance_type_id_instance_types_id_fk" FOREIGN KEY ("instance_type_id") REFERENCES "public"."instance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sandbox_type_id_sandbox_types_id_fk" FOREIGN KEY ("sandbox_type_id") REFERENCES "public"."sandbox_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_domains" ADD CONSTRAINT "proxy_domains_routing_id_project_domain_routing_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."project_domain_routing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_domains" ADD CONSTRAINT "proxy_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_types" ADD CONSTRAINT "sandbox_types_sandbox_region_sandbox_regions_id_fk" FOREIGN KEY ("sandbox_region") REFERENCES "public"."sandbox_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shh_keys" ADD CONSTRAINT "shh_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat" ADD CONSTRAINT "telegram_bot_chat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session" ADD CONSTRAINT "telegram_bot_chat_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session" ADD CONSTRAINT "telegram_bot_chat_session_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session_message" ADD CONSTRAINT "telegram_bot_chat_session_message_session_id_telegram_bot_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."telegram_bot_chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session_message" ADD CONSTRAINT "telegram_bot_chat_session_message_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_transactions" ADD CONSTRAINT "payment_gateway_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_grants" ADD CONSTRAINT "user_credit_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_grants" ADD CONSTRAINT "user_credit_grants_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet" ADD CONSTRAINT "user_wallet_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet_transactions" ADD CONSTRAINT "user_wallet_transactions_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet_transactions" ADD CONSTRAINT "user_wallet_transactions_user_wallet_credit_id_user_credit_grants_id_fk" FOREIGN KEY ("user_wallet_credit_id") REFERENCES "public"."user_credit_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_configs" ADD CONSTRAINT "user_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_login_logs" ADD CONSTRAINT "user_login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD CONSTRAINT "users_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domain_idx" ON "proxy_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "telegram_bot_chat_session_user_project_idx" ON "telegram_bot_chat_session" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "telegram_bot_chat_session_message_context_idx" ON "telegram_bot_chat_session_message" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "config_user_id_type_unique" ON "user_configs" USING btree ("user_id","config_type");