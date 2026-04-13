CREATE TABLE "project_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"domain" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "allowed_ips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_domain_id" uuid NOT NULL,
	"ip" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proxy_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar NOT NULL,
	"target_host" varchar NOT NULL,
	"target_port" varchar NOT NULL,
	"allow_any" boolean DEFAULT false NOT NULL,
	"project_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "proxy_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "project_domains" ADD CONSTRAINT "project_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowed_ips" ADD CONSTRAINT "allowed_ips_proxy_domain_id_proxy_domains_id_fk" FOREIGN KEY ("proxy_domain_id") REFERENCES "public"."proxy_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_domains" ADD CONSTRAINT "proxy_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domain_idx" ON "proxy_domains" USING btree ("domain");