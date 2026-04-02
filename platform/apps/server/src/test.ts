import { db, eq, githubRepos, users } from "@repo/db";
import { octokitApp } from "./webhooks/github/handler.js";
import { checkAppInstallationInRepo } from "./github-app-functions/check-appinstallation.js";

export default async function test() {
  console.log(`Test server in running`);

  // things to here :-> create the token to clone the repo
  //
  await checkAppInstallationInRepo({
    repo: "aichat",
    owner: "jashandeep31",
  });

  // const repoUrl = "https://github.com/jashandeep31/aichat";
  // const repoFullName = "jashandeep31/aichat";
  // const [owner, repo] = repoFullName.split("/");
  // if (!owner || !repo) return;
  // const { data: installation } = await octokitApp.octokit.request(
  //   "GET /repos/{owner}/{repo}/installation",
  //   { owner, repo },
  // );
  // console.log(installation);
  //
  // const { data: tokenData } = await octokitApp.octokit.request(
  //   "POST /app/installations/{installation_id}/access_tokens",
  //   {
  //     installation_id: installation.id,
  //     repositories: [repo], // scope to just this repo
  //     permissions: {
  //       contents: "read", // read-only to contents
  //       metadata: "read", // required by GitHub alongside contents
  //     },
  //   },
  // );
  // console.log(tokenData, "token");
  // --- Please remove this line if you wanna run the function ----
  if (1 === 1) return;

  const res = await octokitApp.eachRepository(async (repo) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, repo.repository.owner.login));

    if (!user) {
      return;
    }
    const [isRepo] = await db
      .select()
      .from(githubRepos)
      .where(eq(githubRepos.full_name, repo.repository.full_name));

    if (!isRepo) {
      await db.insert(githubRepos).values({
        user_id: user.id,
        full_name: repo.repository.full_name,
        repo_owner_username: repo.repository.owner.login,
      });
    }
  });
}
