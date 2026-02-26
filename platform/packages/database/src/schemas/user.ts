import { pgTable, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().unique().defaultRandom(),

  first_name: varchar().notNull(),
  last_name: varchar(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

export const accountProviders = pgEnum("account_providers", ["google"]);
export const acountStatus = pgEnum("account_status", [
  "active",
  "banned",
  "deleted",
]);

export const accounts = pgTable("accounts", {
  id: uuid().unique().defaultRandom(),
  user_id: uuid().references(() => users.id),

  provider: accountProviders().notNull(),
  status: acountStatus().notNull().default("active"),

  deleted_at: timestamp(),

  last_login_at: timestamp(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
