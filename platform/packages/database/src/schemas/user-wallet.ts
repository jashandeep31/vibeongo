import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const userWallet = pgTable("user_wallet", {
  id: uuid().primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .defaultRandom()
    .notNull()
    .unique(),

  balance: integer().default(0).notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const userWalletTransactionType = pgEnum(
  "user_wallet_transaction_type",
  ["deposit", "spent", "withdrawal"],
);

export const userCreditGrants = pgTable("user_credit_grants", {
  id: uuid().primaryKey().defaultRandom(),
  total_balance: integer().default(0).notNull(),
  balance: integer().default(0).notNull(),
  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  description: text(),
  wallet_id: uuid().references(() => userWallet.id, { onDelete: "cascade" }),
  expires_at: timestamp().notNull(),
  expired: boolean().notNull().default(false),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const userWalletTransactions = pgTable("user_wallet_transactions", {
  id: uuid().primaryKey().defaultRandom(),
  transaction_type: userWalletTransactionType("transaction_type").notNull(),

  wallet_id: uuid()
    .references(() => userWallet.id, { onDelete: "cascade" })
    .notNull(),

  description: text().notNull(),
  raw_description: text().notNull(),

  amount: integer().notNull(),
  user_wallet_credit_id: uuid().references(() => userCreditGrants.id, {
    onDelete: "cascade",
  }),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const paymentGatewayTransactionStatus = pgEnum(
  "payment_gateway_transaction_status",
  ["pending", "success", "failed"],
);
export const paymentGatewayTransactions = pgTable(
  "payment_gateway_transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    user_id: uuid().references(() => users.id, { onDelete: "cascade" }),
    amount: integer().notNull(),

    sessionId: varchar().unique(),
    status: paymentGatewayTransactionStatus().default("pending"),
    completed_at: timestamp(),
    raw: text(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
  },
);
