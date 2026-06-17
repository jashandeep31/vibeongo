import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
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

  allow_all_ips: boolean().notNull().default(false),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const routingAllowedIps = pgTable(
  "routing_allowed_ips",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    routing_id: uuid()
      .references(() => projectDomainRouting.id, {
        onDelete: "cascade",
      })
      .notNull(),
    ip: varchar("ip").notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique("routing_id_ip").on(t.ip, t.routing_id)],
);
