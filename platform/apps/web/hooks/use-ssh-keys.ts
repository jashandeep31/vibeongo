import {
  createSshKey,
  getSshKeys,
  deleteSshKey,
  updateSshKey,
} from "@/services/shh-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSshKeys = () =>
  useQuery({
    queryKey: ["ssh-keys"],
    queryFn: getSshKeys,
  });

export const useCreateSshKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSshKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssh-keys"] });
    },
  });
};

export const useDeleteSshKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSshKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssh-keys"] });
    },
  });
};

export const useUpdateSshKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSshKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssh-keys"] });
    },
  });
};
