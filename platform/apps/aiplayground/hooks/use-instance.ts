import {
  getInstances,
  terminateInstance,
  type GetInstancesFilters,
} from "@/services/instance-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetInstances = (
  filters: GetInstancesFilters = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["instances", filters],
    queryFn: () => getInstances(filters),
    enabled,
  });

export const useTerminateInstance = (projectId: string, sessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: terminateInstance,
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] });
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};
