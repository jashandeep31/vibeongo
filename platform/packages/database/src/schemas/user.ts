import { pgTable, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";

export const userRoles = pgEnum("users_roles", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid().unique().defaultRandom(),
  email: varchar({ length: 255 }).notNull().unique(),

  first_name: varchar().notNull(),
  last_name: varchar(),
  role: userRoles().default("user"),

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

export const usersApiKeys = pgTable("users_api_keys", {
  id: uuid().unique().defaultRandom(),
  user_id: uuid().references(() => users.id),

  expires_at: timestamp().defaultNow(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
