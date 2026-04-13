import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  boolean,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./user.js";

export const proxyDomains = pgTable(
  "proxy_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // domain full like xyz.vibeongo.one
    domain: varchar("domain").notNull().unique(),

    // instance based redirecting
    target_host: varchar(),
    target_port: integer().notNull(),
    allow_any: boolean().notNull().default(false),

    project_id: uuid()
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [uniqueIndex("domain_idx").on(t.domain)],
);

export const allowedIps = pgTable("allowed_ips", {
  id: uuid("id").defaultRandom().primaryKey(),

  proxy_domain_id: uuid()
    .references(() => proxyDomains.id, {
      onDelete: "cascade",
    })
    .notNull(),

  ip: varchar("ip").notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
