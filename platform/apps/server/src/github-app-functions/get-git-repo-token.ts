import { gitRepos } from "@repo/db";
import { octokitApp } from "../webhooks/github/index.js";
import { getForgejoRepoAccessToken } from "../services/forgejo/repo-actions.js";

/**
 * Function allow to get the readonly token for the github repo
 *
 * @param repo_name - The name of the github repo don't include the owner
 * @param installationId - The installation id of the github app
 * @returns The readonly token for the github repo
 */
export const getGitRepoToken = async (
  repo: typeof gitRepos.$inferSelect,
): Promise<string> => {
  console.log(repo);
  if (repo.type === "github") {
    const { data } = await octokitApp.octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: repo.installation_id,
        repositories: [repo.full_name.split("/").pop()!],
        permissions: {
          contents: "write", // read-only to contents
          metadata: "read", // required by GitHub alongside contents
          issues: "write",
          pull_requests: "write",
        },
      },
    );
    return data.token;
  } else {
    const data = await getForgejoRepoAccessToken({
      username: repo.repo_owner_username,
      reponame: repo.full_name.split("/")[1]!,
    });

    return data;
  }
};
