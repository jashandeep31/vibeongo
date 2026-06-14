CREATE TYPE "public"."user_login_method_enum" AS ENUM('github');--> statement-breakpoint
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
ALTER TABLE "user_login_logs" ADD CONSTRAINT "user_login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;