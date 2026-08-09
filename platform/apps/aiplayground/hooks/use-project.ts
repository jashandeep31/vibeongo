import {
  addAllowedIpToProject,
  createProjectFile,
  createGithubRepo,
  createProject,
  deleteMultipleAllowedIpsFromProject,
  deleteProject,
  deleteProjectFile,
  getGithubRepos,
  getProjectDomainsById,
  getProjectConfigForEdit,
  getProjectGithubReposById,
  getProjectFilesById,
  getProjects,
  getProjectsWithSessions,
  updateProjectRoutingTargetInstance,
  updateProject,
  updateProjectFile,
  updateProjectDomainAccess,
  updateProjectDomainPort,
} from "@/services/project-services";
import { useProjectsStore } from "@/store/playground-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateGithubRepo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGithubRepo,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["github-repos"] }),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: ({ data: project }) => {
      useProjectsStore.getState().addProject(project);
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: ({ data: project }, variables) => {
      useProjectsStore.getState().updateProject(variables.id, project);
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "edit-config"],
      });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, projectId) => {
      useProjectsStore.getState().deleteProject(projectId);
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useGetGithubRepos = () =>
  useQuery({
    queryKey: ["github-repos"],
    queryFn: getGithubRepos,
  });

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

export const useGetProjectConfigForEdit = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "edit-config"],
    queryFn: () => getProjectConfigForEdit(id!),
    enabled: Boolean(id),
  });

export const useGetProjectFilesById = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "files"],
    queryFn: () => getProjectFilesById(id!),
    enabled: Boolean(id),
  });

export const useCreateProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useUpdateProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

export const useDeleteProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProjectFile,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      }),
  });
};

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

export const useAddAllowedIpToProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addAllowedIpToProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useDeleteMultipleAllowedIpsFromProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMultipleAllowedIpsFromProject,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectDomainAccess,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
  });
};

export const useUpdateProjectDomainPort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectDomainPort,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      }),
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
