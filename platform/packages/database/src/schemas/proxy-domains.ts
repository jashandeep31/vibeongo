import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  uniqueIndex,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { projectDomainRouting } from "./project-domain-routing.js";
import { users } from "./user.js";

export const proxyDomains = pgTable(
  "proxy_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // domain full like xyz.vibeongo.one
    domain: varchar("domain").notNull().unique(),

    // domain-level port mapping; host is chosen from project_domain_routing
    target_port: integer().notNull(),

    routing_id: uuid()
      .references(() => projectDomainRouting.id, {
        onDelete: "cascade",
      })
      .notNull(),
    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    is_editable: boolean("is_editable").default(true).notNull(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [uniqueIndex("domain_idx").on(t.domain)],
);
