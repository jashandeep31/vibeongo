import {
  createGithubRepo,
  getGithubRepos,
  deleteGithubRepo,
  updateGithubRepoById,
  getGithubRepoById,
  type GithubRepo,
  type GithubRepoInclude,
  type GithubRepoWithIssues,
  type GithubRepoWithPullRequests,
  generateFixForIssue,
} from "@/services/github-repo-services";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

export const useCreateGithubRepo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGithubRepo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export function useGetGithubRepoById(
  id: string,
  include: "issues",
): UseQueryResult<GithubRepoWithIssues>;
export function useGetGithubRepoById(
  id: string,
  include: "pull_requests",
): UseQueryResult<GithubRepoWithPullRequests>;
export function useGetGithubRepoById(
  id: string,
  include?: undefined,
): UseQueryResult<GithubRepo>;
export function useGetGithubRepoById(
  id: string,
  include?: GithubRepoInclude,
): UseQueryResult<
  GithubRepo | GithubRepoWithIssues | GithubRepoWithPullRequests
>;
export function useGetGithubRepoById(
  id: string,
  include?: GithubRepoInclude,
): UseQueryResult<
  GithubRepo | GithubRepoWithIssues | GithubRepoWithPullRequests
> {
  return useQuery({
    queryKey: ["github-repo", id, include],
    queryFn: async () => {
      return getGithubRepoById(id, include);
    },
  });
}

export const useGetGithubRepos = () =>
  useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const repos = await getGithubRepos();
      return repos;
    },
  });

export const useDeleteGithubRepo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGithubRepo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export const useUpdateGithubRepoById = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGithubRepoById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export const useGenerateFixForIssue = (id: string, issueNumber: number) =>
  useMutation({
    mutationFn: () => generateFixForIssue(id, issueNumber),
  });
