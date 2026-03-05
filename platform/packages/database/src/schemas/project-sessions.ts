import { pgTable, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./user.js";

export const projectSession = pgTable("project_session", {
  id: uuid().defaultRandom().primaryKey(),

  started_at: timestamp().defaultNow(),
  ended_at: timestamp().defaultNow(),

  user_id: uuid().references(() => users.id, { onDelete: "cascade" }),
  project_id: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  charges: integer().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
