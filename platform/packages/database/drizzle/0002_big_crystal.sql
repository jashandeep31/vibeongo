ALTER TABLE "user_wallet_credits" RENAME TO "user_credit_grants";--> statement-breakpoint
ALTER TABLE "user_credit_grants" DROP CONSTRAINT "user_wallet_credits_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_credit_grants" DROP CONSTRAINT "user_wallet_credits_wallet_id_user_wallet_id_fk";
--> statement-breakpoint
ALTER TABLE "user_wallet_transactions" DROP CONSTRAINT "user_wallet_transactions_user_wallet_credit_id_user_wallet_credits_id_fk";
--> statement-breakpoint
ALTER TABLE "user_credit_grants" ADD CONSTRAINT "user_credit_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_grants" ADD CONSTRAINT "user_credit_grants_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet_transactions" ADD CONSTRAINT "user_wallet_transactions_user_wallet_credit_id_user_credit_grants_id_fk" FOREIGN KEY ("user_wallet_credit_id") REFERENCES "public"."user_credit_grants"("id") ON DELETE cascade ON UPDATE no action;