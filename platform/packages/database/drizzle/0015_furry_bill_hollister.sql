CREATE TYPE "public"."telegram_bot_chat_session_message_role" AS ENUM('user', 'bot');--> statement-breakpoint
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
ALTER TABLE "user_settings" ADD COLUMN "telegram_chat_id" bigint;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat" ADD CONSTRAINT "telegram_bot_chat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session" ADD CONSTRAINT "telegram_bot_chat_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session" ADD CONSTRAINT "telegram_bot_chat_session_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session_message" ADD CONSTRAINT "telegram_bot_chat_session_message_session_id_telegram_bot_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."telegram_bot_chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_bot_chat_session_message" ADD CONSTRAINT "telegram_bot_chat_session_message_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_bot_chat_session_user_project_idx" ON "telegram_bot_chat_session" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "telegram_bot_chat_session_message_context_idx" ON "telegram_bot_chat_session_message" USING btree ("session_id","created_at");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_telegram_chat_id_unique" UNIQUE("telegram_chat_id");