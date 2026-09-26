ALTER TABLE "users_api_keys" DROP CONSTRAINT "users_api_keys_id_unique";--> statement-breakpoint
ALTER TABLE "users_api_keys" DROP CONSTRAINT "users_api_keys_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "users_api_keys" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_api_keys" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_api_keys" ALTER COLUMN "expires_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users_api_keys" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD COLUMN "key_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD CONSTRAINT "users_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_api_keys_user_id_idx" ON "users_api_keys" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users_api_keys" ADD CONSTRAINT "users_api_keys_key_hash_unique" UNIQUE("key_hash");