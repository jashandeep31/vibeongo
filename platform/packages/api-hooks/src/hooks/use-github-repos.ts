import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";
import type { GitRepoActivityType } from "@repo/api-client";

export const useGithubRepos = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: client.githubRepos.getGithubRepos,
  });
};

export const useCreateForgejoRepo = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.githubRepos.createForgejoRepo,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
  });
};

export const useDeleteGithubRepo = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.githubRepos.deleteGithubRepo,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["github-repo", id] });
      return queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export const useGithubRepoIssues = (id: string) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-repo", id, "issues"],
    queryFn: () => client.githubRepos.getGithubRepoIssues(id),
  });
};

export const useGithubRepoPullRequests = (id: string) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-repo", id, "pull-requests"],
    queryFn: () => client.githubRepos.getGithubRepoPullRequests(id),
  });
};

export const useGitRepoActivity = (
  id: string,
  type: GitRepoActivityType,
  options: { page?: number; count?: number; enabled?: boolean } = {},
) => {
  const client = useApiClient();
  const { page = 1, count = 20, enabled = true } = options;

  return useQuery({
    queryKey: ["git-repo", id, "activity", type, page, count],
    queryFn: () =>
      client.githubRepos.getGitRepoActivity({ id, type, page, count }),
    enabled,
  });
};

export const useUpdateGithubRepoAutomation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.githubRepos.updateGithubRepoAutomation,
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
        queryClient.invalidateQueries({
          queryKey: ["github-repo", variables.id],
        }),
      ]),
  });
};

export const useScheduleGithubRepoOverview = () => {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.githubRepos.scheduleGithubRepoOverview,
  });
};

export const useGenerateFixForIssue = (id: string, issueNumber: number) => {
  const client = useApiClient();
  return useMutation({
    mutationFn: () => client.githubRepos.generateFixForIssue(id, issueNumber),
  });
};

export const useGenerateReviewForPullRequest = (
  id: string,
  pullRequestNumber: number,
) => {
  const client = useApiClient();
  return useMutation({
    mutationFn: () =>
      client.githubRepos.generateReviewForPullRequest(id, pullRequestNumber),
  });
};
