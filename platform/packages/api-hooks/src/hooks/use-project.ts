import { useProjectsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const useCreateGithubRepo = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createGithubRepo,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
  });
};

export const useCreateProject = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createProject,
    onSuccess: ({ data: project }) => {
      useProjectsStore.getState().addProject(project);
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useUpdateProject = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProject,
    onSuccess: ({ data: project }, variables) => {
      useProjectsStore.getState().updateProject(variables.id, project);
      void queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "edit-config"],
      });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useDeleteProject = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteProject,
    onSuccess: (_, projectId) => {
      useProjectsStore.getState().deleteProject(projectId);
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useGetGithubRepos = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: client.projects.getGithubRepos,
  });
};

export const useGetProjects = (enabled = true) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["projects"],
    queryFn: client.projects.getProjects,
    enabled,
  });
};

export const useGetProjectsWithSessions = (enabled = true) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["projects", "with-sessions"],
    queryFn: client.projects.getProjectsWithSessions,
    enabled,
  });
};

export const useGetProjectConfigForEdit = (id: string | null) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["project", id!, "edit-config"],
    queryFn: () => client.projects.getProjectConfigForEdit(id!),
    enabled: Boolean(id),
  });
};

export const useGetProjectFilesById = (id: string | null) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["project", id!, "files"],
    queryFn: () => client.projects.getProjectFilesById(id!),
    enabled: Boolean(id),
  });
};

export const useCreateProjectFile = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.createProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useUpdateProjectFile = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useDeleteProjectFile = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useGetProjectDomainsById = (id: string | null, enabled = true) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["project", id!, "domains"],
    queryFn: () => client.projects.getProjectDomainsById(id!),
    enabled: enabled && !!id,
  });
};

export const useUpdateProjectRoutingTargetInstance = () => {
  const client = useApiClient();
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

export const useAddAllowedIpToProject = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.addAllowedIpToProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useDeleteMultipleAllowedIpsFromProject = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.deleteMultipleAllowedIpsFromProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainAccess = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.projects.updateProjectDomainAccess,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainPort = () => {
  const client = useApiClient();
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
  id: string | null,
  enabled = true,
) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["project", id!, "github-repos"],
    queryFn: () => client.projects.getProjectGithubReposById(id!),
    enabled: enabled && !!id,
  });
};
