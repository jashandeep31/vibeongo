import { octokitApp } from "../webhooks/github/handler.js";

/**
 * Function allow to get the readonly token for the github repo
 *
 * @param repo_name - The name of the github repo don't include the owner
 * @param installationId - The installation id of the github app
 * @returns The readonly token for the github repo
 */
export const getGithubRepoReadonlyToken = async (
  repo_name: string,
  installationId: number,
): Promise<string> => {
  const { data } = await octokitApp.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: installationId,
      repositories: [repo_name],
      permissions: {
        contents: "read", // read-only to contents
        metadata: "read", // required by GitHub alongside contents
        // issues: "write",
        // pull_requests: "write",
      },
    },
  );
  return data.token;
};
