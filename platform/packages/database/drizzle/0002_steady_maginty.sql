ALTER TABLE "proxy_domains" ALTER COLUMN "target_host" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proxy_domains" ALTER COLUMN "target_port" SET DATA TYPE integer;