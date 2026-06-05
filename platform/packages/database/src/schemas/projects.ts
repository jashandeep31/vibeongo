import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  text,
  json,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { instanceTypes } from "./instances-metadata.js";
import { sshKeys } from "./ssh-key.js";
import { githubRepos } from "./github-repos.js";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar().notNull(),
  description: text(),

  user_id: uuid()
    .references(() => users.id, {})
    .notNull(),

  instance_type_id: uuid()
    .references(() => instanceTypes.id)
    .notNull(),
  total_charges: integer().notNull().default(0),
  config: json().notNull(),

  initial_script: text().notNull().default(""),
  final_script: text().notNull().default(""),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: uuid().defaultRandom().primaryKey(),
  project_id: uuid().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar().notNull(),
  path: varchar().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectFileData = pgTable(
  "project_file_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: integer().notNull().default(1),
    content: text(),
    project_file_id: uuid()
      .references(() => projectFiles.id, {
        onDelete: "cascade",
      })
      .notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique().on(t.version, t.project_file_id)],
);

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

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const projectGithubRepos = pgTable("project_github_repos", {
  id: uuid("id").defaultRandom().primaryKey(),

  project_id: uuid()
    .references(() => projects.id, {
      onDelete: "cascade",
    })
    .notNull(),

  github_repo_id: uuid()
    .references(() => githubRepos.id, {
      onDelete: "cascade",
    })
    .notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
