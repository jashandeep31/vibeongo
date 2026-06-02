import {
  createGithubRepo,
  getGithubRepos,
  deleteGithubRepo,
  updateGithubRepoById,
  getGithubRepoById,
} from "@/services/github-repo-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateGithubRepo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGithubRepo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
  });
};

export const useGetGithubRepoById = (
  id: string,
  include?: "issues" | "pull_request",
) =>
  useQuery({
    queryKey: ["github-repo", id],
    queryFn: async () => {
      const repo = await getGithubRepoById(id, include);
      return repo;
    },
  });

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
