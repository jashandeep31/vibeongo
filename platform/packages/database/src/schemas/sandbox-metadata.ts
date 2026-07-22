import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const sandboxProvidersEnums = pgEnum("sandbox_providers", ["e2b"]);

export const sandboxRegions = pgTable("sandbox_regions", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),

  provider: sandboxProvidersEnums().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const sandboxTypes = pgTable("sandbox_types", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),
  description: text(),

  cpu: text(),
  ram: text(),

  provider: sandboxProvidersEnums().notNull(),
  sandbox_region: uuid().references(() => sandboxRegions.id, {
    onDelete: "cascade",
  }),

  // NOTE: When using this pricing, we multiply by 1000_000_0.
  // The price per second needs more precision, so it is 10^7.
  price_per_seconds: integer().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
