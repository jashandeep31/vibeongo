import {
  createGithubRepo,
  getGithubRepos,
  deleteGithubRepo,
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
