import { createProject, getProjects } from "@/services/project-services";
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
