import { pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { projects } from "./projects.js";

export const projectChats = pgTable("project_chats", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),

  project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),
  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});
