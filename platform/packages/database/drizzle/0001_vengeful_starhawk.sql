ALTER TABLE "projects" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "instance_type_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "config" json NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_instance_type_id_instance_types_id_fk" FOREIGN KEY ("instance_type_id") REFERENCES "public"."instance_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "ports_config";