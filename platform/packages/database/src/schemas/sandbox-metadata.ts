import {
  bigint,
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const sandboxProvidersEnums = pgEnum("sandbox_providers", [
  "e2b",
  "vercel",
  "daytona",
  "boat",
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

  // CPU count; RAM and storage are measured in GB.
  cpu: integer().notNull().default(4),
  ram: integer().notNull().default(8),
  storage: integer().notNull().default(15),

  enabled: boolean().default(true),
  provider: sandboxProvidersEnums().notNull(),
  sandbox_region: uuid().references(() => sandboxRegions.id, {
    onDelete: "cascade",
  }),

  // Stored as real price * 10^7.
  price_per_second: bigint("price_per_seconds", { mode: "number" }).notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
