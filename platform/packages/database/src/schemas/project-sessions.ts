import {
  pgTable,
  timestamp,
  uuid,
  text,
  varchar,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./user.js";

export const projectSessionsCategory = pgEnum("project_session_category", [
  "manual",
  "auto",
]);
export const projectSessions = pgTable("project_session", {
  id: uuid().defaultRandom().primaryKey(),

  name: varchar().notNull(),
  description: text(),

  started_at: timestamp().defaultNow(),
  archived: boolean().default(false).notNull(),
  category: projectSessionsCategory().notNull().default("manual"),

  user_id: uuid().references(() => users.id, { onDelete: "cascade" }),
  project_id: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  // --- overview is going to get used to resume a session it will store all the changes those has been done can be continued from their ---
  overview: text(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

// --- Projects tasks
// NOTE: we are limiting the options in the typesafe to prevent the coding mistake but infuture depending upon the requirements we can remove this
// and just make string based incase forexample: allowing users to use there own agents
export const projectSessionTaskAgents = pgEnum("project_session_task_agents", [
  "build",
  "plan",
  "reviewer",
  "fixer",
]);
export const projectSessionTasks = pgTable("project_session_tasks", {
  id: uuid().defaultRandom().primaryKey(),

  folder_name: varchar(),
  task: text().notNull(),
  agent: projectSessionTaskAgents().notNull(),
  model: text().notNull().default(""),
  done: boolean().default(false).notNull(),

  project_session_id: uuid()
    .notNull()
    .references(() => projectSessions.id, { onDelete: "cascade" }),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
