import {
  createAuthToken,
  deleteAuthToken,
  getAuthTokens,
} from "@/services/auth-token-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAuthTokens = () =>
  useQuery({
    queryKey: ["auth-tokens"],
    queryFn: getAuthTokens,
  });

export const useCreateAuthToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAuthToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-tokens"] });
    },
  });
};

export const useDeleteAuthToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAuthToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-tokens"] });
    },
  });
};
