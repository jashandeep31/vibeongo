ALTER TABLE "proxy_domains" ADD COLUMN "allow_all_ips" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_domain_routing" DROP COLUMN "allow_all_ips";