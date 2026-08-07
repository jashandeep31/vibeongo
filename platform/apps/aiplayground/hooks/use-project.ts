import {
  getProjectDomainsById,
  getProjectGithubReposById,
  getProjects,
  getProjectsWithSessions,
  updateProjectRoutingTargetInstance,
} from "@/services/project-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetProjects = (enabled = true) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled,
  });

export const useGetProjectsWithSessions = (enabled = true) =>
  useQuery({
    queryKey: ["projects", "with-sessions"],
    queryFn: getProjectsWithSessions,
    enabled,
  });

export const useGetProjectDomainsById = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: ["project", id!, "domains"],
    queryFn: () => getProjectDomainsById(id!),
    enabled: enabled && !!id,
  });

export const useUpdateProjectRoutingTargetInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectRoutingTargetInstance,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};

export const useGetProjectGithubReposById = (
  id: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ["project", id!, "github-repos"],
    queryFn: () => getProjectGithubReposById(id!),
    enabled: enabled && !!id,
  });
