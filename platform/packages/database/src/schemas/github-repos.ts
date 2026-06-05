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

    public: boolean().default(false).notNull(),
    full_name: varchar({ length: 255 }).notNull(),
    repo_owner_username: varchar({ length: 255 }).notNull(),
    setup_script: text().notNull().default(""),

    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.full_name)],
);
