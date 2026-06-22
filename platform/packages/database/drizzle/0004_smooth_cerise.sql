CREATE TABLE "user_settings" (
	"id" uuid DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"default_pr_model" varchar,
	"default_issue_fixer_model" varchar,
	"default_comment_model" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_id_unique" UNIQUE("id"),
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;