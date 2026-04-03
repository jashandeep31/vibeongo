import { db, eq, githubRepos, users } from "@repo/db";
import { octokitApp } from "./webhooks/github/handler.js";
import { getRepoAccessDetails } from "./github-app-functions/get-repo-access-details.js";
import { getGithubRepoReadonlyToken } from "./github-app-functions/get-github-repo-readonly-token.js";

export default async function test() {
  console.log(`Test server in running`);

  // things to here :-> create the token to clone the repo
  //

  const repoUrl = "https://github.com/jashandeep31/aichat";
  const repoFullName = "jashandeep31/aichat";
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return;
  const { data: installation } = await octokitApp.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    { owner, repo },
  );
  console.log(installation);
  const tokenData = await getGithubRepoReadonlyToken("aichat", installation.id);
  console.log(tokenData, "token");
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

    // if (!isRepo) {
    //   await db.insert(githubRepos).values({
    //     user_id: user.id,
    //     installation_id: installation.id,
    //     full_name: repo.repository.full_name,
    //     repo_owner_username: repo.repository.owner.login,
    //   });
    // }
  });
}
