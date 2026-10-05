CREATE TYPE "public"."user_credential_auth_type" AS ENUM('api_key', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."user_credential_provider" AS ENUM('codex');--> statement-breakpoint
CREATE TABLE "user_provider_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "user_credential_provider" DEFAULT 'codex' NOT NULL,
	"auth_type" "user_credential_auth_type" DEFAULT 'oauth' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encrypted_data" text NOT NULL,
	"iv" varchar NOT NULL,
	"tag" text NOT NULL,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_provider_credentials" ADD CONSTRAINT "user_provider_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_credentials_user_id_provider_unique" ON "user_provider_credentials" USING btree ("user_id","provider");