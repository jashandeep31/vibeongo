import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";
import type {
  GetGitRepoAccessTokensParams,
  GitRepoActivityType,
} from "@repo/api-client";

export const useGithubRepos = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: client.githubRepos.getGithubRepos,
  });
};

export const useGitRepoAccessTokens = (
  params: GetGitRepoAccessTokensParams = {},
) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["git-repo-access-tokens", params],
    queryFn: () => client.githubRepos.getGitRepoAccessTokens(params),
  });
};

export const useRevokeGitRepoAccessToken = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.githubRepos.revokeGitRepoAccessToken,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["git-repo-access-tokens"] }),
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
      queryClient.removeQueries({ queryKey: ["git-repo", id] });
      return queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export const useGitRepoById = (id: string) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["git-repo", id],
    queryFn: () => client.githubRepos.getGitRepoById(id),
  });
};

export const useGitRepoActivity = <T extends GitRepoActivityType>(
  id: string,
  type: T,
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

export const useGitRepoActivityDetails = <T extends GitRepoActivityType>(
  id: string,
  type: T,
  number: number,
) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["git-repo", id, "activity", type, number],
    queryFn: () =>
      client.githubRepos.getGitRepoActivityDetails({ id, type, number }),
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
          queryKey: ["git-repo", variables.id],
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
