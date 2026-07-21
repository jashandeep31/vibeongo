import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { githubRepos } from "./github-repos.js";
import { users } from "./user.js";

export const gitRepoOverviewJobsStatusEnum = pgEnum(
  "git_repo_overview_jobs_status_enum",
  ["pending", "processing", "done"],
);
export const gitRepoOverviewJobs = pgTable("git_repo_overview_jobs", {
  id: uuid().primaryKey().defaultRandom(),
  repoId: uuid()
    .references(() => githubRepos.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  status: gitRepoOverviewJobsStatusEnum().default("pending").notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
