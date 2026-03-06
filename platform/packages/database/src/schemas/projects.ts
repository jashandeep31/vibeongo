import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { instances } from "./instances.js";

export const projectStatusEnum = pgEnum("project_status", [
  "running",
  "terminated",
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar().notNull(),
  description: text(),
  status: projectStatusEnum().notNull(),

  total_charges: integer().notNull().default(0),

  instanceId: uuid().references(() => instances.id, { onDelete: "set null" }),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
