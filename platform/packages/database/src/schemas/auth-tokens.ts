import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const authTokenPermissions = pgEnum("auth_token_permissions", [
  "read",
  "write",
]);
export const authTokens = pgTable("auth_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  user_id: uuid().references(() => users.id, {
    onDelete: "cascade",
  }),

  name: varchar({ length: 255 }).notNull(),

  secret: varchar({ length: 255 }).notNull(),
  permission: authTokenPermissions().notNull().default("read"),

  valid_till: timestamp(),
  terminated_at: timestamp(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
