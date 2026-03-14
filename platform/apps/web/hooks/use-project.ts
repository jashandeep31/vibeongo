import { createProject } from "@/services/project-services";
import { useMutation } from "@tanstack/react-query";

export const useCreateProject = () =>
  useMutation({
    mutationFn: createProject,
  });
