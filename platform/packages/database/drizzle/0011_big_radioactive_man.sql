ALTER TYPE "public"."user_login_method_enum" ADD VALUE 'email_password';--> statement-breakpoint
CREATE TABLE "email_auth_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_digest" varchar(64) NOT NULL,
	"staged_password_hash" text,
	"staged_name" varchar(100),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"delivery_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_unique";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_provider_account_id_unique";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "provider_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "account_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_login_method" "user_login_method_enum" DEFAULT 'github' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_auth_challenges" ADD CONSTRAINT "email_auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_password_credentials" ADD CONSTRAINT "user_password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_auth_challenges_user_purpose_idx" ON "email_auth_challenges" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "email_auth_challenges_expiry_idx" ON "email_auth_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_id_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_id_provider_unique" ON "accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_case_insensitive_unique" ON "users" USING btree (lower("email"));