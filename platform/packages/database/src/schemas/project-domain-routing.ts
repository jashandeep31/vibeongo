import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { instances } from "./instances.js";
import { projects } from "./projects.js";
import { users } from "./user.js";

export const projectDomainRouting = pgTable("project_domain_routing", {
  id: uuid("id").defaultRandom().primaryKey(),

  project_id: uuid()
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  target_instance_id: uuid().references(() => instances.id, {
    onDelete: "set null",
  }),

  updated_by: uuid().references(() => users.id, { onDelete: "set null" }),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
