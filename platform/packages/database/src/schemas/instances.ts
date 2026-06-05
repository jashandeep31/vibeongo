import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { instanceTypes } from "./instances-metadata.js";
import { users } from "./user.js";
import { projectSessions } from "./project-sessions.js";

export const instanceState = pgEnum("instance_state", [
  "running",
  "terminated",
]);

export const instances = pgTable("instances", {
  id: uuid().defaultRandom().primaryKey(),

  name: varchar().notNull().default("instance"),

  project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),
  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  instance_type_id: uuid().references(() => instanceTypes.id),
  project_session_id: uuid().references(() => projectSessions.id, {
    onDelete: "set null",
  }),

  terminated_at: timestamp(),
  started_at: timestamp(),
  state: instanceState().notNull(),
  session_cost: integer().notNull().default(0),

  // Overview by the ai so if needed then we can resume the session with context
  overview: text(),

  // instance data
  public_ip: varchar(),
  private_ip: varchar(),
  aws_instance_id: varchar().notNull(), // NOTE: this refers to the aws instance is

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
