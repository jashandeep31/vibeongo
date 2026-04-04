import {
  pgTable,
  timestamp,
  uuid,
  integer,
  text,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
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

  // --- overview is going to get used to resume a session it will store all the changes those has been done can be continued from their ---
  overview: text(),
  charges: integer().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

export const projectSessionTasks = pgTable("project_session_tasks", {
  id: uuid().defaultRandom().primaryKey().notNull(),

  project_session_id: uuid().references(() => projectSession.id, {
    onDelete: "cascade",
  }),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

// --- Projects tasks
// --- example: add the support to the google auth
export const projectTasks = pgTable("project_tasks", {
  id: uuid().defaultRandom().primaryKey(),

  folder_name: varchar(),
  task: text().notNull(),
  done: boolean().default(false),

  project_session_task_id: uuid().references(() => projectSessionTasks.id, {
    onDelete: "cascade",
  }),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
