import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  check,
  pgEnum,
  unique,
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

  last_run_at: timestamp(),
  next_run_at: timestamp(),

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
  ["queued", "working", "allocating", "done", "failed", "cancelled"],
);

export const projectAutomationRunSource = pgEnum(
  "project_automation_run_source",
  ["manual", "webhook", "schedule"],
);

export const projectAutomationTriggerProviders = pgEnum(
  "project_automation_trigger_providers",
  ["sentry", "custom"],
);

export const projectAutomationRuns = pgTable(
  "project_automation_runs",
  {
    id: uuid().primaryKey().defaultRandom(),

    project_automation_id: uuid().references(() => projectAutomations.id, {
      onDelete: "cascade",
    }),

    project_automation_trigger_id: uuid().references(
      () => projectAutomationTriggers.id,
      { onDelete: "set null" },
    ),

    provider: projectAutomationTriggerProviders(),
    project_request_unique_id: varchar(),
    source: projectAutomationRunSource().notNull(),
    status: projectAutomationRunsStatus().notNull().default("queued"),
    input: text(),
    error: text(),
    project_session_id: uuid()
      .unique()
      .references(() => projectSessions.id, {
        onDelete: "set null",
      }),

    scheduled_for: timestamp(),

    user_feedback: varchar({}),
    user_rating: integer(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [
    check("rating_range_check", sql`${table.user_rating} BETWEEN 1 AND 5`),
    unique(
      "project_automation_runs_trigger_project_request_unique_id_unique",
    ).on(
      table.project_automation_trigger_id,
      table.provider,
      table.project_request_unique_id,
    ),
    unique("project_automation_runs_automation_scheduled_for_unique").on(
      table.project_automation_id,
      table.scheduled_for,
    ),
  ],
);

export const automationScheduleOutbox = pgTable(
  "automation_schedule_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    automation_run_id: uuid()
      .references(() => projectAutomationRuns.id, { onDelete: "cascade" })
      .notNull(),
    delivered_at: timestamp(),
    attempts: integer().notNull().default(0),
    last_error: text(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => [
    unique("automation_schedule_outbox_automation_run_id_unique").on(
      table.automation_run_id,
    ),
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
    provider: projectAutomationTriggerProviders().notNull(),
    deleted_at: timestamp(),

    lasted_triggered_at: timestamp().defaultNow().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
);
