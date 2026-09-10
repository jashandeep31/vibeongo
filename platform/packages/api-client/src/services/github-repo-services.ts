import { gitRepos } from "@repo/db";
import type { AxiosInstance } from "axios";

export type GithubRepo = typeof gitRepos.$inferSelect & {
  html_url: string;
};

export type GitRepoIssue = {
  id: number;
  number: number;
  html_url: string;
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

export type GitRepoPullRequest = {
  id: number;
  number: number;
  html_url: string;
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

export type CreateForgejoRepoInput = {
  reponame: string;
};

export type GitRepoActivityType = "pr" | "issue";

export type GetGitRepoActivityInput<T extends GitRepoActivityType> = {
  id: string;
  type: T;
  page?: number;
  count?: number;
};

export type GitRepoActivityResponse<T extends GitRepoActivityType> = {
  data: T extends "issue" ? GitRepoIssue[] : GitRepoPullRequest[];
  pagination: {
    page: number;
    count: number;
    hasMore: boolean;
  };
};

export type GetGitRepoActivityDetailsInput<
  T extends GitRepoActivityType,
> = {
  id: string;
  type: T;
  number: number;
};

export const createForgejoRepo =
  (apiClient: AxiosInstance) =>
  async (input: CreateForgejoRepoInput): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/git-repos/forgejo`, input, {
      withCredentials: true,
    });

    return response.data;
  };

export const getGithubRepos =
  (apiClient: AxiosInstance) => async (): Promise<GithubRepo[]> => {
    const response = await apiClient.get(`/api/v1/git-repos/`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const deleteGithubRepo =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/git-repos/${id}`, {
      withCredentials: true,
    });

    return response.data;
  };

export const getGitRepoById =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<GithubRepo> => {
    const response = await apiClient.get(`/api/v1/git-repos/${id}`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getGitRepoActivity =
  (apiClient: AxiosInstance) =>
  async <T extends GitRepoActivityType>({
    id,
    type,
    page = 1,
    count = 20,
  }: GetGitRepoActivityInput<T>): Promise<GitRepoActivityResponse<T>> => {
    const response = await apiClient.get(`/api/v1/git-repos/${id}/activity`, {
      withCredentials: true,
      params: { type, page, count },
    });

    return response.data;
  };

export const getGitRepoActivityDetails =
  (apiClient: AxiosInstance) =>
  async <T extends GitRepoActivityType>({
    id,
    type,
    number,
  }: GetGitRepoActivityDetailsInput<T>): Promise<
    T extends "issue" ? GitRepoIssue : GitRepoPullRequest
  > => {
    const response = await apiClient.get(
      `/api/v1/git-repos/${id}/activity/${type}/${number}`,
      { withCredentials: true },
    );

    return response.data.data;
  };

export const updateGithubRepoAutomation =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    setup_script,
    default_project_id,
    auto_review_pull_requests_enabled,
    auto_fix_issues_enabled,
  }: Pick<
    GithubRepo,
    | "id"
    | "setup_script"
    | "default_project_id"
    | "auto_review_pull_requests_enabled"
    | "auto_fix_issues_enabled"
  >): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/git-repos/${id}`,
      {
        setup_script,
        default_project_id,
        auto_review_pull_requests_enabled,
        auto_fix_issues_enabled,
      },
      { withCredentials: true },
    );

    return response.data;
  };

export const scheduleGithubRepoOverview =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/git-repos/${id}/schedule-overview`,
      {},
      { withCredentials: true },
    );

    return response.data;
  };

export const generateFixForIssue =
  (apiClient: AxiosInstance) =>
  async (
    id: string,
    issueNumber: number,
  ): Promise<{ instanceId: string; projectId: string }> => {
    const response = await apiClient.post(
      `/api/v1/git-repos/${id}/issue/${issueNumber}`,
      {},
      { withCredentials: true },
    );

    return response.data.data;
  };

export const generateReviewForPullRequest =
  (apiClient: AxiosInstance) =>
  async (
    id: string,
    pullRequestNumber: number,
  ): Promise<{ instanceId: string; projectId: string }> => {
    const response = await apiClient.post(
      `/api/v1/git-repos/${id}/pull-request/${pullRequestNumber}`,
      {},
      { withCredentials: true },
    );

    return response.data.data;
  };
