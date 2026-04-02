import { octokitApp } from "../webhooks/github/handler.js";

export const checkAppInstallationInRepo = async ({
  repo,
  owner,
}: {
  repo: string;
  owner: string;
}): Promise<boolean> => {
  try {
    const { data } = await octokitApp.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      {
        owner,
        repo,
      },
    );
    if (data.id === null || data.client_id === null) return false;

    // Get installation-level octokit
    const installationOctokit = await octokitApp.getInstallationOctokit(
      data.id,
    );

    // Now use this for repo requests
    const { data: repoData } = await installationOctokit.request(
      "GET /repos/{owner}/{repo}",
      { owner, repo },
    );
    console.log(repoData);

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
