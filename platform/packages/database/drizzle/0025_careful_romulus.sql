CREATE TABLE "instance_openrouter_keys" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid PRIMARY KEY NOT NULL,
	"hash" varchar NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" varchar NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instance_openrouter_keys_id_unique" UNIQUE("id"),
	CONSTRAINT "instance_openrouter_keys_instance_id_unique" UNIQUE("instance_id")
);
--> statement-breakpoint
ALTER TABLE "instance_openrouter_keys" ADD CONSTRAINT "instance_openrouter_keys_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;