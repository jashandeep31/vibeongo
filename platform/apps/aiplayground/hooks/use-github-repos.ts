import {
  generateFixForIssue,
  generateReviewForPullRequest,
  getGithubRepoIssues,
  getGithubRepoPullRequests,
  getGithubRepos,
  scheduleGithubRepoOverview,
  updateGithubRepoAutomation,
} from "@/services/github-repo-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGithubRepos = () =>
  useQuery({
    queryKey: ["github-repos"],
    queryFn: getGithubRepos,
  });

export const useGithubRepoIssues = (id: string) =>
  useQuery({
    queryKey: ["github-repo", id, "issues"],
    queryFn: () => getGithubRepoIssues(id),
  });

export const useGithubRepoPullRequests = (id: string) =>
  useQuery({
    queryKey: ["github-repo", id, "pull-requests"],
    queryFn: () => getGithubRepoPullRequests(id),
  });

export const useUpdateGithubRepoAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGithubRepoAutomation,
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
        queryClient.invalidateQueries({
          queryKey: ["github-repo", variables.id],
        }),
      ]),
  });
};

export const useScheduleGithubRepoOverview = () =>
  useMutation({ mutationFn: scheduleGithubRepoOverview });

export const useGenerateFixForIssue = (id: string, issueNumber: number) =>
  useMutation({ mutationFn: () => generateFixForIssue(id, issueNumber) });

export const useGenerateReviewForPullRequest = (
  id: string,
  pullRequestNumber: number,
) =>
  useMutation({
    mutationFn: () => generateReviewForPullRequest(id, pullRequestNumber),
  });
