import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { instanceTypes } from "./instances-metadata.js";

export const instanceState = pgEnum("instance_state", [
  "running",
  "terminated",
]);

export const instances = pgTable("instances", {
  id: uuid().defaultRandom().primaryKey(),

  project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),
  instance_type: uuid().references(() => instanceTypes.id),

  terminated_at: timestamp(),
  started_at: timestamp(),
  state: instanceState().notNull(),

  // instance data
  public_ip: varchar(),
  private_ip: varchar(),
  aws_instance_id: varchar().notNull(), // NOTE: this refers to the aws instance is

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
