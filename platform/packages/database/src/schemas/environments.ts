import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const environments = pgTable("environments", {
  id: uuid().unique().defaultRandom().primaryKey(),
  user_id: uuid()
    .references(() => users.id)
    .notNull(),

  config: text().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
