import {
  createProject,
  getProjectById,
  getProjects,
} from "@/services/project-services";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useCreateProject = () =>
  useMutation({
    mutationFn: createProject,
  });

export const useGetProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await getProjects();
      return projects;
    },
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
