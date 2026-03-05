import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// currently we are only using the aws instances
// TODO: please further add more regions to this
export const instancesRegionsEnum = pgEnum("instances_regions", [
  "us-east-1",
  "us-east-2",
]);
export const instancesProvidersEnum = pgEnum("instances_providers", ["aws"]);
export const instances = pgTable("instances", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),

  // WARN: slug should contain the region at the end of the slug
  slug: varchar().notNull().unique(),

  region: instancesRegionsEnum().notNull(),
  provider: instancesProvidersEnum().notNull(),

  pricePerHour: integer().notNull(),
  pricePerSec: integer().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
