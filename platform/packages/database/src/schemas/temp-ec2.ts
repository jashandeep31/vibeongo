import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// this is the temp table for testing the local things nothing has to be taken to the production
export const ec2StatusEnum = pgEnum("ec2_status", ["running", "terminated"]);
export const ec2 = pgTable("ec2", {
  id: uuid().unique().defaultRandom(),
  ec2_id: varchar().notNull(),
  region: varchar().notNull(),
  ip: varchar(),
  status: ec2StatusEnum().notNull().default("running"),
  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
