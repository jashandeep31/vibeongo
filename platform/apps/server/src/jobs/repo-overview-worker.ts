import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import {
  GIT_REPOS_OVERVIEW_QUEUE_NAME,
  type GitRepoOverviewJobData,
} from "./repo-overview.js";

import { Sandbox } from "e2b";
import { and, db, eq, githubRepos, gitRepoOverviewJobs } from "@repo/db";
import { getGithubRepoToken } from "../github-app-functions/get-github-repo-readonly-token.js";
import { env } from "../lib/env.js";
import { string } from "zod";

export const gitRepoOverviewWorker = new Worker<GitRepoOverviewJobData>(
  GIT_REPOS_OVERVIEW_QUEUE_NAME,
  async (job) => {
    console.log(`job is working `);
    const jobData = job.data;

    const [repo] = await db
      .select()
      .from(githubRepos)
      .where(and(eq(githubRepos.id, jobData.repoId)));

    if (!repo) {
      await db.update(gitRepoOverviewJobs).set({
        status: "failed",
        error: "Repo not found ",
      });
      return;
    }
    const repoName: string = repo.full_name.split("/")[1]!;

    const gitRepoToken = await getGithubRepoToken(
      repoName,
      repo.installation_id,
    );

    const sandbox = await Sandbox.create("opencode", {
      envs: {},
      timeoutMs: 1000 * 60 * 10,
      apiKey: env.E2B_API_KEY,
    });

    await sandbox.git.clone(`https://github.com/${repo.full_name}.git`, {
      path: `/home/user/${repoName}`,
      username: "x-access-token",
      password: gitRepoToken,
      depth: 1,
    });

    const result = await sandbox.commands.run(
      `cd /home/user/${repoName} && opencode run "Create the vibeongo.md file even if one exists delete it and create a new one after creating it write the complete overview about this repo in which you are running. by overview i don't mean which repo url is it who own it I mean is what is repo about. what is purpose of thsi repo who the main thsings are working under repo what is the file structure and other important things about thsi repo when someone is starting to work on this repo. Don't include things like last merged PR it should only aboabout the present code "`,
      {
        timeoutMs: 1000 * 60 * 10,
        onStdout: (data: string) => {
          process.stdout.write(data);
        },
      },
    );

    const diff = await sandbox.commands.run(
      `cat /home/user/${repoName}/vibeongo.md`,
    );
    console.log(diff.stdout);

    if (diff.stdout) {
      await db
        .update(githubRepos)
        .set({
          overview: diff.stdout,
        })
        .where(eq(githubRepos.id, jobData.repoId));
    }

    await sandbox.kill();
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

gitRepoOverviewWorker.on("ready", () => {
  console.log("GitHub repository overview worker is ready");
});

gitRepoOverviewWorker.on("error", (error) => {
  console.error("GitHub repository overview worker error", error);
});

gitRepoOverviewWorker.on("failed", (job, error) => {
  console.error(
    `GitHub repository overview job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
