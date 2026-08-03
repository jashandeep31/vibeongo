import { getProjects } from "@/services/project-services";
import { useQuery } from "@tanstack/react-query";

export const useGetProjects = (enabled = true) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled,
  });
