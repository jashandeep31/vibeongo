import { forgejoAPIClient } from "./user-actions.js";

export type ForgejoPrOrIssueType = "pr" | "issue";

export interface ForgejoPrOrIssueUser {
  id: number;
  login: string;
  username?: string;
  avatar_url: string;
  html_url: string;
}

export interface ForgejoPrOrIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user: ForgejoPrOrIssueUser;
  assignee: ForgejoPrOrIssueUser | null;
  assignees: ForgejoPrOrIssueUser[] | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments?: number;
  labels?: Array<{
    id?: number;
    name: string | null;
    color: string | null;
  }>;
  merged?: boolean;
  merged_at?: string | null;
  draft?: boolean;
  head?: { ref: string; sha: string };
  base?: { ref: string; sha: string };
}

export interface GetForgejoPrOrIssuesInput {
  owner: string;
  repo: string;
  type: ForgejoPrOrIssueType;
  page?: number;
  count?: number;
}

/**
 * Returns a page of pull requests or issues from a Forgejo repository.
 * `count` is sent to Forgejo as the API's `limit` query parameter.
 */
export async function getForgejoPrOrIssues({
  owner,
  repo,
  type,
  page = 1,
  count = 20,
}: GetForgejoPrOrIssuesInput): Promise<ForgejoPrOrIssue[]> {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError("page must be a positive integer");
  }

  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("count must be a positive integer");
  }

  const endpoint = type === "pr" ? "pulls" : "issues";
  const response = await forgejoAPIClient.get<ForgejoPrOrIssue[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${endpoint}`,
    {
      params: {
        page,
        limit: count,
      },
    },
  );

  return response.data;
}
