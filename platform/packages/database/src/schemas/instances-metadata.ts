import {
  bigint,
  pgEnum,
  pgTable,
  boolean,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

// currently we are only using the aws instances
// TODO: please further add more regions to this

export const instanceProvidersEnum = pgEnum("instance_providers", [
  "aws",
  "digitalocean",
]);

export const instanceRegions = pgTable("instance_regions", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),
  ami: varchar().notNull(),

  provider: instanceProvidersEnum().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const instanceTypes = pgTable("instance_types", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),

  slug: varchar().notNull(),
  description: text(),
  // CPU count; RAM and storage are measured in GB.
  cpu: integer().notNull().default(4),
  ram: integer().notNull().default(8),
  storage: integer().notNull().default(15),

  provider: instanceProvidersEnum().notNull(),
  region_id: uuid().references(() => instanceRegions.id),

  // Stored as real price * 10^7.
  price_per_hour: bigint({ mode: "number" }).notNull(),

  enabled: boolean().default(true),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
