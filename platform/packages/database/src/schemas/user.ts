import { pgTable, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";

export const userRoles = pgEnum("users_roles", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid().unique().defaultRandom().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  username: varchar({ length: 255 }).notNull().unique(),

  first_name: varchar().notNull(),
  last_name: varchar(),
  role: userRoles().default("user").notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const accountProviders = pgEnum("account_providers", ["github"]);
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
  token: varchar({ length: 255 }).notNull(),

  deleted_at: timestamp(),

  last_login_at: timestamp(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const usersApiKeys = pgTable("users_api_keys", {
  id: uuid().unique().defaultRandom(),
  user_id: uuid().references(() => users.id),

  expires_at: timestamp().defaultNow(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
