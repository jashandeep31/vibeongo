import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGithubRepos = (client: ApiClient) =>
  useQuery({
    queryKey: ["github-repos"],
    queryFn: client.githubRepos.getGithubRepos,
  });

export const useGithubRepoIssues = (client: ApiClient, id: string) =>
  useQuery({
    queryKey: ["github-repo", id, "issues"],
    queryFn: () => client.githubRepos.getGithubRepoIssues(id),
  });

export const useGithubRepoPullRequests = (client: ApiClient, id: string) =>
  useQuery({
    queryKey: ["github-repo", id, "pull-requests"],
    queryFn: () => client.githubRepos.getGithubRepoPullRequests(id),
  });

export const useUpdateGithubRepoAutomation = (client: ApiClient) => {
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

export const useScheduleGithubRepoOverview = (client: ApiClient) =>
  useMutation({ mutationFn: client.githubRepos.scheduleGithubRepoOverview });

export const useGenerateFixForIssue = (
  client: ApiClient,
  id: string,
  issueNumber: number,
) =>
  useMutation({
    mutationFn: () => client.githubRepos.generateFixForIssue(id, issueNumber),
  });

export const useGenerateReviewForPullRequest = (
  client: ApiClient,
  id: string,
  pullRequestNumber: number,
) =>
  useMutation({
    mutationFn: () =>
      client.githubRepos.generateReviewForPullRequest(id, pullRequestNumber),
  });
