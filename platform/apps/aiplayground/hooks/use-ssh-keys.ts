import {
  createSshKey,
  deleteSshKey,
  getSshKeys,
  updateSshKey,
} from "@/services/ssh-key-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSshKeys = () =>
  useQuery({ queryKey: ["ssh-keys"], queryFn: getSshKeys });

const useRefreshingMutation = <T>(mutationFn: (input: T) => Promise<void>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ssh-keys"] }),
  });
};

export const useCreateSshKey = () => useRefreshingMutation(createSshKey);
export const useUpdateSshKey = () => useRefreshingMutation(updateSshKey);
export const useDeleteSshKey = () => useRefreshingMutation(deleteSshKey);
