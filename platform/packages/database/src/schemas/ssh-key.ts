import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const sshKeys = pgTable("shh_keys", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),

  user_id: uuid().references(() => users.id, { onDelete: "cascade" }),
  value: text().notNull(),

  updated_at: timestamp().notNull().defaultNow(),
  created_at: timestamp().notNull().defaultNow(),
});
