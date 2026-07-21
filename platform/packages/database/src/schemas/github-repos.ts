import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  unique,
  boolean,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { projects } from "./projects.js";

export const githubRepos = pgTable(
  "github_repos",
  {
    id: uuid().primaryKey().defaultRandom(),
    user_id: uuid()
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),

    default_project_id: uuid()
      .references(() => projects.id, {
        onDelete: "set null",
      })
      .unique(),
    installation_id: integer().notNull(),

    auto_review_pull_requests_enabled: boolean().default(false).notNull(),
    auto_fix_issues_enabled: boolean().default(false).notNull(),
    overview: text().default("").notNull(),

    public: boolean().default(false).notNull(),
    full_name: varchar({ length: 255 }).notNull(),
    repo_owner_username: varchar({ length: 255 }).notNull(),
    setup_script: text().notNull().default(""),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.full_name)],
);

export const githubRepoMembers = pgTable(
  "github_repo_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    repo_id: uuid()
      .references(() => githubRepos.id, { onDelete: "cascade" })
      .notNull(),

    username: varchar().notNull(),

    can_trigger_pull_request: boolean().default(false).notNull(),
    can_trigger_issue: boolean().default(false).notNull(),
    can_trigger_comment: boolean().default(false).notNull(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique().on(t.username, t.repo_id)],
);
