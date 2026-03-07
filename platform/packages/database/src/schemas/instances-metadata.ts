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
export const instanceRegionsEnum = pgEnum("instance_regions", [
  "us-east-1",
  "us-east-2",
]);

export const instanceProvidersEnum = pgEnum("instance_providers", ["aws"]);

export const instanceTypes = pgTable("instance_types", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),

  // WARN: slug should contain the region at the end of the slug
  slug: varchar().notNull().unique(),
  description: text(),
  cpu: text(),
  ram: text(),

  region: instanceRegionsEnum().notNull(),
  provider: instanceProvidersEnum().notNull(),

  price_per_hour: integer().notNull(),
  price_per_sec: integer().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
