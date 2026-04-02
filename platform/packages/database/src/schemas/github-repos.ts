import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  unique,
  boolean,
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

    public: boolean().default(false),
    full_name: varchar({ length: 255 }).notNull(), // Full name refers to the username/reponame example "jashandeep31/vibeongo"
    repo_owner_username: varchar({ length: 255 }).notNull(), // username refers to the github username  example "jashandeep31"

    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow(),
  },
  (t) => [unique().on(t.full_name, t.user_id)],
);
