import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { instances } from "./instances.js";

export const instanceOpenRouterKeys = pgTable("instance_openrouter_keys", {
  id: uuid().unique().defaultRandom().notNull(),

  instance_id: uuid()
    .primaryKey()
    .references(() => instances.id, { onDelete: "cascade" })
    .notNull(),

  hash: varchar().notNull(),
  encrypted_key: text().notNull(),
  iv: varchar().notNull(),
  tag: text().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
