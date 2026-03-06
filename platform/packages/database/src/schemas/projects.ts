import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  text,
} from "drizzle-orm/pg-core";

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

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
