import {
  check,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./projects.js";
import { instanceTypes } from "./instances-metadata.js";
import { sandboxTypes } from "./sandbox-metadata.js";
import { users } from "./user.js";
import { projectSessions } from "./project-sessions.js";

export const instanceState = pgEnum("instance_state", [
  "running",
  "terminated",
]);

export const instanceRuntimeKind = pgEnum("instance_runtime_kind", [
  "ec2",
  "sandbox",
]);

export const instances = pgTable(
  "instances",
  {
    id: uuid().defaultRandom().primaryKey(),

    name: varchar().notNull().default("instance"),

    project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),
    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    runtime_kind: instanceRuntimeKind().notNull().default("ec2"),
    instance_type_id: uuid().references(() => instanceTypes.id),
    sandbox_type_id: uuid().references(() => sandboxTypes.id),
    project_session_id: uuid().references(() => projectSessions.id, {
      onDelete: "set null",
    }),

    terminates_at: timestamp().notNull(),
    terminated_at: timestamp(),
    started_at: timestamp().notNull().defaultNow(),
    state: instanceState().notNull(),
    session_cost: integer().notNull().default(0),
    config: json().notNull().default("{}"),

    // Overview by the ai so if needed then we can resume the session with context
    overview: text(),

    // instance data
    public_ip: varchar(),
    private_ip: varchar(),
    provider_instance_id: varchar().notNull(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [
    check(
      "instances_exactly_one_runtime_type",
      sql`
        (
          ${table.runtime_kind} = 'ec2'
          AND ${table.instance_type_id} IS NOT NULL
          AND ${table.sandbox_type_id} IS NULL
        )
        OR
        (
          ${table.runtime_kind} = 'sandbox'
          AND ${table.sandbox_type_id} IS NOT NULL
          AND ${table.instance_type_id} IS NULL
        )
      `,
    ),
  ],
);
