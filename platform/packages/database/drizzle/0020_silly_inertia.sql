CREATE TYPE "public"."user_config_type" AS ENUM('opencode', 'codex', 'pi');--> statement-breakpoint
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
ALTER TABLE "user_configs" ADD CONSTRAINT "user_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "config_user_id_type_unique" ON "user_configs" USING btree ("user_id","config_type");