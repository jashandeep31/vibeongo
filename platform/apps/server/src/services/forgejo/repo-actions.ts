import { forgejoAPIClient } from "./user-actions.js";
import axios from "axios";

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
