import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { projects } from "./projects.js";

export const githubRepos = pgTable("github_repos", {
  id: uuid().primaryKey().defaultRandom(),

  user_id: uuid().references(() => users.id, {
    onDelete: "cascade",
  }),
  project_id: uuid()
    .references(() => projects.id, {
      onDelete: "set null",
    })
    .unique(),

  full_name: varchar({ length: 255 }).notNull().unique(),
  repo_owner_username: varchar({ length: 255 }).notNull(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
