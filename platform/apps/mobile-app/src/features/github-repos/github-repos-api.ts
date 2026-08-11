import { ApiError, apiFetch, apiRequest } from "@/lib/api";

export type GithubRepo = {
  id: string;
  user_id: string;
  default_project_id: string | null;
  installation_id: number;
  auto_review_pull_requests_enabled: boolean;
  auto_fix_issues_enabled: boolean;
  overview: string;
  public: boolean;
  full_name: string;
  repo_owner_username: string;
  setup_script: string;
  created_at: string;
  updated_at: string | null;
};

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
  user?: { login: string; avatar_url: string };
  labels: Array<{
    id?: number;
    name: string | null;
    color: string | null;
  }>;
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
  user?: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
};

export type GithubRepoWithIssues = GithubRepo & {
  issues: GithubRepoIssue[];
};

export type GithubRepoWithPullRequests = GithubRepo & {
  pull_requests: GithubRepoPullRequest[];
};

export type ProjectOption = { id: string; name: string };

export function getGithubRepos(signal?: AbortSignal) {
  return apiRequest<GithubRepo[]>("/api/v1/github-repos/", {}, signal);
}

export function getGithubRepoIssues(id: string, signal?: AbortSignal) {
  return apiRequest<GithubRepoWithIssues>(
    `/api/v1/github-repos/${encodeURIComponent(id)}?include=issues`,
    {},
    signal,
  );
}

export function getGithubRepoPullRequests(id: string, signal?: AbortSignal) {
  return apiRequest<GithubRepoWithPullRequests>(
    `/api/v1/github-repos/${encodeURIComponent(id)}?include=pull_requests`,
    {},
    signal,
  );
}

export function getProjects(signal?: AbortSignal) {
  return apiRequest<ProjectOption[]>("/api/v1/projects/", {}, signal);
}

export function createGithubRepo(input: { url: string; setup_script: string }) {
  return apiMutation("/api/v1/github-repos/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGithubRepoAutomation(
  repo: GithubRepo,
  input: {
    default_project_id: string | null;
    auto_review_pull_requests_enabled: boolean;
    auto_fix_issues_enabled: boolean;
  },
) {
  return apiMutation(`/api/v1/github-repos/${encodeURIComponent(repo.id)}`, {
    method: "POST",
    body: JSON.stringify({ ...input, setup_script: repo.setup_script }),
  });
}

export function scheduleGithubRepoOverview(id: string) {
  return apiMutation(
    `/api/v1/github-repos/${encodeURIComponent(id)}/schedule-overview`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function generateFixForIssue(id: string, issueNumber: number) {
  return apiMutation(
    `/api/v1/github-repos/${encodeURIComponent(id)}/issue/${issueNumber}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function generateReviewForPullRequest(
  id: string,
  pullRequestNumber: number,
) {
  return apiMutation(
    `/api/v1/github-repos/${encodeURIComponent(id)}/pull-request/${pullRequestNumber}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

async function apiMutation(path: string, init: RequestInit) {
  const response = await apiFetch(path, init);
  const body = (await response.json().catch(() => null)) as {
    data?: unknown;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return body;
}
