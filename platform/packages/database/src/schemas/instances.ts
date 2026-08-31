import {
  check,
  bigint,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  json,
  integer,
  boolean,
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
  "vm",
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
    runtime_kind: instanceRuntimeKind().notNull().default("vm"),
    instance_type_id: uuid().references(() => instanceTypes.id),
    sandbox_type_id: uuid().references(() => sandboxTypes.id),
    project_session_id: uuid().references(() => projectSessions.id, {
      onDelete: "set null",
    }),

    terminates_at: timestamp().notNull(),
    terminated_at: timestamp(),
    started_at: timestamp().notNull().defaultNow(),
    state: instanceState().notNull(),
    // Stored as real cost * 10^7.
    session_cost: bigint({ mode: "number" }).notNull().default(0),
    config: json().notNull().default("{}"),

    // Overview by the ai so if needed then we can resume the session with context
    overview: text(),

    // instance data
    public_ip: varchar(),
    private_ip: varchar(),
    provider_instance_id: varchar().notNull(),
    proxy_domain: varchar().notNull(),

    // used by the instance id based route
    access_token: varchar().notNull(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [
    check(
      "instances_exactly_one_runtime_type",
      sql`
        (
          ${table.runtime_kind} = 'vm'
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

export const instanceSlotStatus = pgEnum("instance_slot_status", [
  "queued",
  "provisioning",
  "active",
  "failed",
  "terminating",
  "terminated",
  "cancelled",
  "expired",
]);

export const instanceSlotInstanceCategory = pgEnum(
  " instance_slot_instance_category",
  ["auto", "manual"],
);
export const instanceSlots = pgTable("instance_slots", {
  id: uuid().defaultRandom().primaryKey(),

  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  instance_id: uuid()
    .references(() => instances.id, {
      onDelete: "set null",
    })
    .unique(),
  session_id: uuid()
    .references(() => projectSessions.id, {
      onDelete: "cascade",
    })
    .notNull(),

  priority: integer().default(0).notNull(),
  error: text(),

  category: instanceSlotInstanceCategory().notNull(),

  runtime_kind: instanceRuntimeKind().notNull(),
  instance_type_id: uuid().references(() => instanceTypes.id),
  sandbox_type_id: uuid().references(() => sandboxTypes.id),
  assign_domains: boolean().default(false).notNull(),
  spined_up_by: varchar(),

  status: instanceSlotStatus().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
