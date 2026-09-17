import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import {
  projectSessions,
  projectSessionTaskAgents,
} from "./project-sessions.js";
import { users } from "./user.js";
import { projects } from "./projects.js";
import { sql } from "drizzle-orm";

export const projectAutomations = pgTable("project_automations", {
  id: uuid().primaryKey().defaultRandom(),

  name: varchar().notNull(),
  description: text(),

  user_id: uuid().references(() => users.id, { onDelete: "cascade" }),
  project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),

  last_run_at: timestamp().defaultNow().notNull(),
  next_run_at: timestamp().defaultNow().notNull(),

  enabled: boolean(),

  cron_expression: varchar(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectAutomationRuns = pgTable(
  "project_automation_runs",
  {
    id: uuid().primaryKey().defaultRandom(),

    project_automation_id: uuid().references(() => projectAutomations.id, {
      onDelete: "cascade",
    }),
    project_session_id: uuid().references(() => projectSessions.id, {
      onDelete: "set null",
    }),

    user_feedback: varchar({}),
    user_rating: integer(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [
    check("rating_range_check", sql`${table.user_rating} BETWEEN 1 AND 5`),
  ],
);

export const projectAutomationTasks = pgTable("project_automation_tasks", {
  id: uuid().primaryKey().defaultRandom(),

  project_automation_id: uuid().references(() => projectAutomations.id, {
    onDelete: "cascade",
  }),

  path_from_code: varchar().notNull(),
  task: text().notNull(),
  agent: projectSessionTaskAgents().notNull(),

  order_number: integer().notNull(),
  model: text().notNull().default(""),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
