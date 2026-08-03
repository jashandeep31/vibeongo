import {
  getInstances,
  type GetInstancesFilters,
} from "@/services/instance-services";
import { useQuery } from "@tanstack/react-query";

export const useGetInstances = (
  filters: GetInstancesFilters = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["instances", filters],
    queryFn: () => getInstances(filters),
    enabled,
  });
