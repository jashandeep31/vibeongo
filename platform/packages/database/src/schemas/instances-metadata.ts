import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// currently we are only using the aws instances
// TODO: please further add more regions to this

export const instanceProvidersEnum = pgEnum("instance_providers", ["aws"]);

export const instanceRegions = pgTable("instance_regions", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  slug: varchar().notNull(),

  provider: instanceProvidersEnum().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const instanceTypes = pgTable("instance_types", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),

  // WARN: slug should contain the region at the end of the slug
  slug: varchar().notNull().unique(),
  description: text(),
  cpu: text(),
  ram: text(),

  provider: instanceProvidersEnum().notNull(),
  region_id: uuid().references(() => instanceRegions.id),

  price_per_hour: integer().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
