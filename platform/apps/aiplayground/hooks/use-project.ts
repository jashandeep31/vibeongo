import {
  getProjectDomainsById,
  getProjectGithubReposById,
  getProjects,
  getProjectsWithSessions,
} from "@/services/project-services";
import { useQuery } from "@tanstack/react-query";

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

export const useGetProjectGithubReposById = (
  id: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ["project", id!, "github-repos"],
    queryFn: () => getProjectGithubReposById(id!),
    enabled: enabled && !!id,
  });
