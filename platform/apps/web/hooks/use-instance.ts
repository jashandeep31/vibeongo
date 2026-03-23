import {
  createInstance,
  getInstanceById,
  getInstances,
} from "@/services/instance-servies";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useCreateInstance = () =>
  useMutation({
    mutationFn: createInstance,
  });

export const useGetInstances = () =>
  useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const res = await getInstances();
      return res.data;
    },
  });

export const useGetInstanceById = (id: string) =>
  useQuery({
    queryKey: ["instance", id],
    queryFn: async () => {
      const res = await getInstanceById(id);
      return res.data;
    },
  });
