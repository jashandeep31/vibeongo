import {
  getProjectDomainsById,
  getProjects,
} from "@/services/project-services";
import { useQuery } from "@tanstack/react-query";

export const useGetProjects = (enabled = true) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled,
  });

export const useGetProjectDomainsById = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: ["project", id!, "domains"],
    queryFn: () => getProjectDomainsById(id!),
    enabled: enabled && !!id,
  });
