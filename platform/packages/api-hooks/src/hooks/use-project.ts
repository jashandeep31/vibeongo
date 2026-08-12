import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateGithubRepo = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createGithubRepo,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
  });
};

export const useCreateProject = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createProject,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      }),
  });
};

export const useUpdateProject = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProject,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "edit-config"],
      });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useDeleteProject = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteProject,
    onSuccess: (_, projectId) => {
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useGetGithubRepos = (client: ApiClient) =>
  useQuery({
    queryKey: ["github-repos"],
    queryFn: client.projects.getGithubRepos,
  });

export const useGetProjects = (client: ApiClient, enabled = true) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: client.projects.getProjects,
    enabled,
  });

export const useGetProjectsWithSessions = (client: ApiClient, enabled = true) =>
  useQuery({
    queryKey: ["projects", "with-sessions"],
    queryFn: client.projects.getProjectsWithSessions,
    enabled,
  });

export const useGetProjectConfigForEdit = (
  client: ApiClient,
  id: string | null,
) =>
  useQuery({
    queryKey: ["project", id!, "edit-config"],
    queryFn: () => client.projects.getProjectConfigForEdit(id!),
    enabled: Boolean(id),
  });

export const useGetProjectFilesById = (client: ApiClient, id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "files"],
    queryFn: () => client.projects.getProjectFilesById(id!),
    enabled: Boolean(id),
  });

export const useCreateProjectFile = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useUpdateProjectFile = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useDeleteProjectFile = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useGetProjectDomainsById = (
  client: ApiClient,
  id: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ["project", id!, "domains"],
    queryFn: () => client.projects.getProjectDomainsById(id!),
    enabled: enabled && !!id,
  });

export const useUpdateProjectRoutingTargetInstance = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectRoutingTargetInstance,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};

export const useAddAllowedIpToProject = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.addAllowedIpToProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useDeleteMultipleAllowedIpsFromProject = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteMultipleAllowedIpsFromProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainAccess = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectDomainAccess,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainPort = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectDomainPort,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useGetProjectGithubReposById = (
  client: ApiClient,
  id: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ["project", id!, "github-repos"],
    queryFn: () => client.projects.getProjectGithubReposById(id!),
    enabled: enabled && !!id,
  });
