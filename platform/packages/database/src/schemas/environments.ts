import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const environments = pgTable("environments", {
  id: uuid().defaultRandom().primaryKey(),
  user_id: uuid()
    .references(() => users.id)
    .notNull(),

  config: text().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
