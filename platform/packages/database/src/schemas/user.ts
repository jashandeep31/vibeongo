import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  pgEnum,
  boolean,
  integer,
  bigint,
} from "drizzle-orm/pg-core";

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
  verified: boolean().notNull().default(true),
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

export const userLoginMethodEnum = pgEnum("user_login_method_enum", ["github"]);
export const userLoginLogs = pgTable("user_login_logs", {
  id: uuid().unique().defaultRandom(),
  user_id: uuid().references(() => users.id),

  ip_address: varchar(),
  user_agent: varchar(),
  login_method: userLoginMethodEnum().default("github"),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid().defaultRandom().unique(),

  user_id: uuid()
    .references(() => users.id)
    .notNull()
    .unique(),

  default_pr_model: varchar(),
  default_issue_fixer_model: varchar(),
  default_comment_model: varchar(),
  default_model: varchar(),
  telegram_chat_id: bigint({ mode: "number" }).unique(),

  default_issue_instance_auto_terminate_after_minutes: integer()
    .default(30)
    .notNull(),
  default_pr_instance_auto_terminate_after_minutes: integer()
    .default(30)
    .notNull(),
  default_manual_instance_auto_terminate_after_minutes: integer()
    .default(120)
    .notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
