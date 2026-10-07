CREATE TABLE "ssh_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"project_session_id" uuid NOT NULL,
	"instance_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ssh_access_tokens" ADD CONSTRAINT "ssh_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ssh_access_tokens" ADD CONSTRAINT "ssh_access_tokens_project_session_id_project_session_id_fk" FOREIGN KEY ("project_session_id") REFERENCES "public"."project_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ssh_access_tokens" ADD CONSTRAINT "ssh_access_tokens_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ssh_access_tokens_token_hash_idx" ON "ssh_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ssh_access_tokens_user_session_idx" ON "ssh_access_tokens" USING btree ("user_id","project_session_id");--> statement-breakpoint
CREATE INDEX "ssh_access_tokens_instance_id_idx" ON "ssh_access_tokens" USING btree ("instance_id");