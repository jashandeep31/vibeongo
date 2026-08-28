import { env } from "../../lib/env.js";

type GitRepoLinkSource = {
  type: "github" | "forgejo" | null;
  full_name: string;
};

export const getGitRepoHtmlUrl = (repo: GitRepoLinkSource): string =>
  repo.type === "forgejo"
    ? `${env.FORGEJO_URL.replace(/\/$/, "")}/${repo.full_name}`
    : `https://github.com/${repo.full_name}`;

export const withGitRepoHtmlUrl = <T extends GitRepoLinkSource>(repo: T) => ({
  ...repo,
  html_url: getGitRepoHtmlUrl(repo),
});
