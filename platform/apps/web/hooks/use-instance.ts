import {
  createInstance,
  getInstanceById,
  getInstances,
  getInstancesByProjectId,
  terminateInstance,
} from "@/services/instance-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateInstance = () =>
  useMutation({
    mutationFn: createInstance,
  });

export const useGetInstances = ({ running }: { running: boolean }) =>
  useQuery({
    queryKey: ["instances"],
    queryFn: () => getInstances({ running }),
  });

export const useGetInstancesByProjectId = (projectId: string) =>
  useQuery({
    queryKey: ["instances", "project", projectId],
    queryFn: () => getInstancesByProjectId(projectId),
    enabled: !!projectId,
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
      queryClient.invalidateQueries({ queryKey: ["instances", "project", id] });
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] });
    },
  });
};
