import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  text,
  json,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { instanceTypes } from "./instances-metadata.js";
import { sshKeys } from "./ssh-key.js";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar().notNull(),
  description: text(),

  user_id: uuid()
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),

  instance_type_id: uuid()
    .references(() => instanceTypes.id)
    .notNull(),
  total_charges: integer().notNull().default(0),
  config: json().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: uuid().defaultRandom().primaryKey(),

  name: varchar().notNull(),
  path: varchar().notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

export const projectFileData = pgTable("project_file_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer(),
  project_file_id: uuid().references(() => projectFiles.id, {
    onDelete: "cascade",
  }),
  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

export const projectSshKeys = pgTable("project_ssh_keys", {
  id: uuid("id").defaultRandom().primaryKey(),

  project_id: uuid()
    .references(() => projects.id, {
      onDelete: "cascade",
    })
    .notNull(),

  ssh_key_id: uuid()
    .references(() => sshKeys.id, {
      onDelete: "cascade",
    })
    .notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
