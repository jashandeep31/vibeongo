ALTER TYPE "public"."chat_agent_enum" ADD VALUE 'vibeongo-agent';--> statement-breakpoint
ALTER TABLE "chat_questions" ADD COLUMN "payload" jsonb DEFAULT '{"mentions":[]}'::jsonb NOT NULL;