import {
  createInstance,
  getInstanceById,
  getInstances,
  terminateInstance,
} from "@/services/instance-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateInstance = () =>
  useMutation({
    mutationFn: createInstance,
  });

export const useGetInstances = () =>
  useQuery({
    queryKey: ["instances"],
    queryFn: getInstances,
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
