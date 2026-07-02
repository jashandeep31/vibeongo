import {
  addAllowedIpToProject,
  createProject,
  createProjectFile,
  deleteAllowedIpFromProject,
  deleteMultipleAllowedIpsFromProject,
  deleteProject,
  deleteProjectFile,
  getProjectById,
  getProjectConfigForEdit,
  getProjectDomainsById,
  getProjectFilesById,
  getProjects,
  updateProject,
  updateProjectFile,
  updateProjectRoutingTargetInstance,
  updateProjectDomainPort,
} from "@/services/project-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateProject = () =>
  useMutation({
    mutationFn: createProject,
  });

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "edit-config"],
      });
    },
  });
};

export const useGetProjects = (enabled = true) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await getProjects();
      return projects;
    },
    enabled,
  });

export const useGetProjectById = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!],
    queryFn: async () => {
      const project = await getProjectById(id!);
      return project;
    },
    enabled: !!id,
  });

export const useGetProjectConfigForEdit = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "edit-config"],
    queryFn: async () => {
      const projectConfig = await getProjectConfigForEdit(id!);
      return projectConfig;
    },
    enabled: !!id,
  });

export const useGetProjectFilesById = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "files"],
    queryFn: async () => {
      const files = await getProjectFilesById(id!);
      return files;
    },
    enabled: !!id,
  });

export const useCreateProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      });
    },
  });
};

export const useUpdateProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      });
    },
  });
};

export const useDeleteProjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProjectFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "files"],
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useGetProjectDomainsById = (id: string | null) =>
  useQuery({
    queryKey: ["project", id!, "domains"],
    queryFn: async () => {
      const domains = await getProjectDomainsById(id!);
      return domains;
    },
    enabled: !!id,
  });

export const useAddAllowedIpToProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addAllowedIpToProject,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
    },
  });
};

export const useDeleteAllowedIpFromProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllowedIpFromProject,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
    },
  });
};

export const useDeleteMultipleAllowedIpsFromProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMultipleAllowedIpsFromProject,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
    },
  });
};

export const useUpdateProjectDomainPort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectDomainPort,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
    },
  });
};

export const useUpdateProjectRoutingTargetInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectRoutingTargetInstance,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project", variables.id, "domains"],
      });
      queryClient.invalidateQueries({
        queryKey: ["instances", "project", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["instance", variables.instanceId],
      });
    },
  });
};
