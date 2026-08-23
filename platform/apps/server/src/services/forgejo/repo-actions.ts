import { users } from "@repo/db";
import { forgejoAPIClient } from "./user-actions.js";
import axios from "axios";
import crypto from "crypto";
import { AppError } from "../../lib/app-error.js";

interface CreateForgejoRepo {
  username: string;
  reponame: string;
  description?: string;
}
type ForgejoRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
};

type CreateForgejoRepoResult =
  | {
      status: "ok";
      repo: ForgejoRepo;
    }
  | {
      status: "error";
      error: string;
    };

type ForkedForgejoRepo = {
  owner: string;
  name: string;
  url: string;
  full_name: string;
};

type ForgejoForkResponse = Omit<ForkedForgejoRepo, "owner"> & {
  owner: {
    login: string;
  };
};

type ForkForgejoRepoResult =
  | {
      status: "ok";
      repo: ForkedForgejoRepo;
    }
  | {
      status: "error";
      error: string;
    };

export async function createForgejoRepo({
  username,
  reponame,
  description,
}: CreateForgejoRepo): Promise<CreateForgejoRepoResult> {
  try {
    const res = await forgejoAPIClient.post<ForgejoRepo>(
      `/admin/users/${username}/repos`,
      {
        default_branch: "main",
        description,
        name: reponame,
        object_format_name: "sha1",
        private: true,
        template: true,
        trust_model: "default",
      },
    );

    return {
      status: "ok",
      repo: res.data,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      return {
        status: "error",
        error: error.response?.data?.message ?? error.message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to create repository",
    };
  }
}

export async function getForgejoRepo({
  username,
  reponame,
}: {
  username: string;
  reponame: string;
}): Promise<ForgejoRepo | null> {
  try {
    const res = await forgejoAPIClient.get<ForgejoRepo>(
      `/repos/${username}/${reponame}`,
    );
    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getForgejoRepoAccessToken({
  username,
  reponame,
}: {
  username: string;
  reponame: string;
}): Promise<string> {
  const res = await forgejoAPIClient.post(`/admin/users/${username}/tokens`, {
    username: username,
    name: `vibeongo-access-token-${crypto.randomBytes(16).toString("hex")}`,
    repositories: [
      {
        name: reponame,
        owner: username,
      },
    ],
    scopes: [
      "read:issue",
      "write:issue",
      "read:repository",
      "write:repository",
    ],
  });
  return res.data.sha1 as string;
}

export async function forkRepoToForgejo({
  sourceRepoOwnername,
  sourceReponame,
  forkFor,
  newReponame,
  newRepoOrganizationName,
}: {
  sourceRepoOwnername: string;
  sourceReponame: string;
  forkFor: string;
  newReponame?: string;
  newRepoOrganizationName?: string;
}): Promise<ForkForgejoRepoResult> {
  const tokenName = `temp-token-${crypto.randomBytes(4).toString("hex")}`;
  let tokenId = null;
  try {
    const tokenResponse = await forgejoAPIClient.post(
      `/admin/users/${forkFor}/tokens`,
      {
        name: tokenName,
        scopes: ["write:repository", "read:repository"],
      },
    );

    tokenId = tokenResponse.data.id;

    const token = tokenResponse.data.sha1;
    if (!token) throw new AppError("Failed to create token", 500);

    const res = await forgejoAPIClient.post<ForgejoForkResponse>(
      `/repos/${sourceRepoOwnername}/${sourceReponame}/forks`,
      {
        ...(newReponame ? { name: newReponame } : {}),
        ...(newRepoOrganizationName
          ? { organization: newRepoOrganizationName }
          : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (res.status !== 202) {
      return {
        status: "error",
        error: `Unexpected Forgejo response status: ${res.status}`,
      };
    }

    return {
      status: "ok",
      repo: {
        owner: res.data.owner.login,
        name: res.data.name,
        url: res.data.url,
        full_name: res.data.full_name,
      },
    };
  } catch (error: unknown) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      return {
        status: "error",
        error: error.response?.data?.message ?? error.message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to fork repository",
    };
  } finally {
    await forgejoAPIClient.delete(
      `/admin/users/${forkFor}/tokens/${tokenId ?? tokenName}`,
    );
  }
}
