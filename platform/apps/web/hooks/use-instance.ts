import {
  createInstance,
  getInstanceById,
  getInstances,
  terminateInstance,
} from "@/services/instance-services";
import type { GetInstancesFilters } from "@/services/instance-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateInstance = () =>
  useMutation({
    mutationFn: createInstance,
  });

export const useGetInstances = (filters: GetInstancesFilters = {}) =>
  useQuery({
    queryKey: ["instances", filters],
    queryFn: () => getInstances(filters),
  });

export const useGetInstanceById = (id: string) =>
  useQuery({
    queryKey: ["instance", id],
    queryFn: () => getInstanceById(id),
    enabled: !!id,
  });

export const useTerminateInstance = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceId: string) => terminateInstance(instanceId),
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] });
    },
  });
};
