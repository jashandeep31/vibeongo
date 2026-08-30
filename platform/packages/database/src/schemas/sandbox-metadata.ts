import {
  bigint,
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  boolean,
} from "drizzle-orm/pg-core";

export const sandboxProvidersEnums = pgEnum("sandbox_providers", [
  "e2b",
  "vercel",
  "daytona",
]);

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

  enabled: boolean().default(true),
  provider: sandboxProvidersEnums().notNull(),
  sandbox_region: uuid().references(() => sandboxRegions.id, {
    onDelete: "cascade",
  }),

  // Stored as real price * 10^7.
  price_per_seconds: bigint({ mode: "number" }).notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
