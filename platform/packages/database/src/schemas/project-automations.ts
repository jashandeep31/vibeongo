import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  check,
  jsonb,
  pgEnum,
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
  project_id: uuid()
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),

  last_run_at: timestamp().defaultNow().notNull(),
  next_run_at: timestamp().defaultNow().notNull(),

  enabled: boolean().notNull().default(true),

  // save the cron expression as a string
  cron_expression: varchar(),
  // timzone is of user
  timezone: varchar(),

  deleted_at: timestamp(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectAutomationRunsStatus = pgEnum(
  "project_automation_run_status",
  ["queued", "running", "completed", "failed", "cancelled"],
);

export const projectAutomationRuns = pgTable(
  "project_automation_runs",
  {
    id: uuid().primaryKey().defaultRandom(),

    project_automation_id: uuid().references(() => projectAutomations.id, {
      onDelete: "cascade",
    }),
    status: projectAutomationRunsStatus().notNull().default("queued"),
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
  task_prompt: text().notNull(),
  agent: projectSessionTaskAgents().notNull(),

  order_number: integer().notNull(),
  model: text().notNull().default(""),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectAutomationTriggers = pgTable(
  "project_automation_triggers",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    project_automation_id: uuid().references(() => projectAutomations.id, {
      onDelete: "cascade",
    }),

    // we will generate a secret key and return it back to the user
    // will store in the database in the hashed format
    webhook_secret: varchar().notNull(),

    lasted_triggered_at: timestamp().defaultNow().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
);

export const projectAutomationTriggerRunsStatus = pgEnum(
  "project_automation_trigger_run_status",
  [
    "queued",
    "working",
    "allocating",
    "done",
    "running",
    "completed",
    "failed",
    "cancelled",
  ],
);

export const projectAutomationTriggerRuns = pgTable(
  "project_automation_trigger_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: projectAutomationTriggerRunsStatus().notNull().default("queued"),

    input: text().notNull(),
    error: varchar({}),
    project_session_id: uuid().references(() => projectSessions.id, {
      onDelete: "set null",
    }),
    project_automation_trigger_id: uuid().references(
      () => projectAutomationTriggers.id,
      {
        onDelete: "cascade",
      },
    ),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
);
