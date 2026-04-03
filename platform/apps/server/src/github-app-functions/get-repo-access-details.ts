import { octokitApp } from "../webhooks/github/handler.js";
import { Endpoints } from "@octokit/types";

export type RepoAccessDetails =
  Endpoints["GET /repos/{owner}/{repo}"]["response"]["data"];

type RepoAccessResult =
  | {
      hasAppAccess: false;
      isPublic: null;
      repoData: null;
      installationId: null;
    }
  | {
      hasAppAccess: true;
      isPublic: boolean;
      repoData: RepoAccessDetails;
      installationId: number;
    };

export const getRepoAccessDetails = async ({
  repo,
  owner,
}: {
  repo: string;
  owner: string;
}): Promise<RepoAccessResult> => {
  try {
    const { data } = await octokitApp.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      {
        owner,
        repo,
      },
    );
    if (data.id === null || data.client_id === null) {
      return {
        hasAppAccess: false,
        isPublic: null,
        repoData: null,
        installationId: null,
      };
    }

    const installationOctokit = await octokitApp.getInstallationOctokit(
      data.id,
    );

    const { data: repoData } = await installationOctokit.request(
      "GET /repos/{owner}/{repo}",
      { owner, repo },
    );

    return {
      hasAppAccess: true,
      isPublic: repoData.private ? false : true,
      repoData: repoData,
      installationId: data.id,
    };
  } catch (e) {
    console.error("Error fetching repo access details:", e);
    return {
      hasAppAccess: false,
      isPublic: null,
      repoData: null,
      installationId: null,
    };
  }
};
