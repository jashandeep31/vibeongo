import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";
import type { PasswordAuthUser } from "@repo/api-client";

export const currentUserQueryKey = ["current-user"] as const;

export function useCurrentUser(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: client.users.getCurrentUser,
    enabled,
    retry: false,
  });
}

function usePasswordLoginSuccess() {
  const queryClient = useQueryClient();
  return async (user: PasswordAuthUser) => {
    // Discard data from any prior account before showing the new user's workspace.
    await queryClient.cancelQueries();
    queryClient.removeQueries();
    queryClient.setQueryData(currentUserQueryKey, user);
  };
}

export function useSignupWithPassword() {
  const client = useApiClient();
  const onSuccess = usePasswordLoginSuccess();
  return useMutation({
    mutationFn: client.users.signupWithPassword,
    onSuccess,
    retry: false,
    gcTime: 0,
  });
}

export function useSigninWithPassword() {
  const client = useApiClient();
  const onSuccess = usePasswordLoginSuccess();
  return useMutation({
    mutationFn: client.users.signinWithPassword,
    onSuccess,
    retry: false,
    gcTime: 0,
  });
}

export function useMobileSignupWithPassword() {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.users.mobileSignupWithPassword,
    retry: false,
    gcTime: 0,
  });
}

export function useMobileSigninWithPassword() {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.users.mobileSigninWithPassword,
    retry: false,
    gcTime: 0,
  });
}

export function useGithubConnection() {
  const client = useApiClient();
  return useQuery({
    queryKey: ["github-connection"],
    queryFn: client.users.getGithubConnection,
    retry: false,
  });
}
export function useStartGithubConnection() {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.users.startGithubConnection,
    retry: false,
  });
}
export function useCompleteMobileGithubConnection() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.completeMobileGithubConnection,
    retry: false,
    gcTime: 0,
    onSuccess: async (user) => {
      await queryClient.invalidateQueries();
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}
