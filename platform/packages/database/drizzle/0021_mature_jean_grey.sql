ALTER TABLE "instance_types" ALTER COLUMN "price_per_hour" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "session_cost" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "total_charges" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "sandbox_types" ALTER COLUMN "price_per_seconds" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "user_credit_grants" ALTER COLUMN "total_balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "user_credit_grants" ALTER COLUMN "balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "user_wallet" ALTER COLUMN "balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "user_wallet_transactions" ALTER COLUMN "amount" SET DATA TYPE bigint;