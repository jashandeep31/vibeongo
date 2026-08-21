import { gitRepos } from "@repo/db";
import type { AxiosInstance } from "axios";

export type GithubRepo = typeof gitRepos.$inferSelect;

export type GithubRepoIssue = {
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

export type GithubRepoPullRequest = {
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

export type GithubRepoWithIssues = GithubRepo & {
  issues: GithubRepoIssue[];
};

export type GithubRepoWithPullRequests = GithubRepo & {
  pull_requests: GithubRepoPullRequest[];
};

export const getGithubRepos =
  (apiClient: AxiosInstance) => async (): Promise<GithubRepo[]> => {
    const response = await apiClient.get(`/api/v1/git-repos/`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getGithubRepoIssues =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<GithubRepoWithIssues> => {
    const response = await apiClient.get(`/api/v1/git-repos/${id}`, {
      withCredentials: true,
      params: { include: "issues" },
    });

    return response.data.data;
  };

export const getGithubRepoPullRequests =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<GithubRepoWithPullRequests> => {
    const response = await apiClient.get(`/api/v1/git-repos/${id}`, {
      withCredentials: true,
      params: { include: "pull_requests" },
    });

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
