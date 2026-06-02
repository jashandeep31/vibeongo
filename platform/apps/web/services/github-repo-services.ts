import { BACKEND_URL } from "@/lib/constants";
import { githubRepos } from "@repo/db";
import { createGithubRepoSchema, z } from "@repo/shared";
import axios from "axios";

export type GithubRepoIssue = {
  url: string;
  html_url: string;
  id: number;
  number: number;
  repository_url: string;
  title: string;
  state: string;
  body: string | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user?: {
    login: string;
    avatar_url: string;
  };
  labels: {
    id?: number;
    name: string | null;
    color: string | null;
  }[];
};

export type GithubRepo = typeof githubRepos.$inferSelect;

export type GithubRepoWithIssues = GithubRepo & {
  issues: GithubRepoIssue[];
};

export type GithubRepoPullRequest = {
  url: string;
  html_url: string;
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user?: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
};

export type GithubRepoWithPullRequests = GithubRepo & {
  pull_requests: GithubRepoPullRequest[];
};

export type GithubRepoInclude = "issues" | "pull_requests";

export function getGithubRepoById(
  id: string,
  include: "issues",
): Promise<GithubRepoWithIssues>;
export function getGithubRepoById(
  id: string,
  include: "pull_requests",
): Promise<GithubRepoWithPullRequests>;
export function getGithubRepoById(
  id: string,
  include?: undefined,
): Promise<GithubRepo>;
export function getGithubRepoById(
  id: string,
  include?: GithubRepoInclude,
): Promise<GithubRepo | GithubRepoWithIssues | GithubRepoWithPullRequests>;

export async function getGithubRepoById(
  id: string,
  include?: GithubRepoInclude,
): Promise<GithubRepo | GithubRepoWithIssues | GithubRepoWithPullRequests> {
  const res = await axios.get(BACKEND_URL + `/api/v1/github-repos/${id}`, {
    withCredentials: true,
    params: { include: include },
  });
  return res.data.data;
}

export const createGithubRepo = async (
  data: z.infer<typeof createGithubRepoSchema>,
) => {
  const res = await axios.post(BACKEND_URL + "/api/v1/github-repos/", data, {
    withCredentials: true,
  });
  return res.data;
};

export const getGithubRepos = async (): Promise<GithubRepo[]> => {
  const res = await axios.get(BACKEND_URL + "/api/v1/github-repos/", {
    withCredentials: true,
  });
  return res.data.data;
};

export const deleteGithubRepo = async (id: string) => {
  const res = await axios.delete(BACKEND_URL + `/api/v1/github-repos/${id}`, {
    withCredentials: true,
  });
  return res.data;
};

export const updateGithubRepoById = async ({
  id,
  setup_script,
  default_project_id,
}: {
  id: string;
  setup_script: string;
  default_project_id: string | null;
}) => {
  const res = await axios.post(
    BACKEND_URL + `/api/v1/github-repos/${id}`,
    {
      setup_script,
      default_project_id,
    },
    {
      withCredentials: true,
    },
  );

  return res.data;
};
