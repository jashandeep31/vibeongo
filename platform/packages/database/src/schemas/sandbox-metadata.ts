import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const sanboxProvidersEnums = pgEnum("sandbox_providers", ["e2b"]);

export const sandboxRegions = pgTable("sanbox_regions", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),

  provider: sanboxProvidersEnums().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const sandboxTypes = pgTable("sanbox_types", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),
  description: text(),

  cpu: text(),
  ram: text(),

  provider: sanboxProvidersEnums().notNull(),
  sandbox_region: uuid().references(() => sandboxRegions.id, {
    onDelete: "cascade",
  }),

  // NOTE: when even we using this pricing  we will be multiplying by 1000_000_0
  // as price per seconds even need more precsion its 10^7
  price_per_seconds: integer().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
