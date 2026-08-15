import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApiClient } from "../api-client-context.js";

type GetUserCreditGrantsParams = NonNullable<
  Parameters<ApiClient["users"]["getUserCreditGrants"]>[0]
>;
type UserConfigType = Parameters<ApiClient["users"]["getUserConfig"]>[0];

const isUnauthorizedError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  (error as { response?: { status?: number } }).response?.status === 401;

const retryUserMetadata = (failureCount: number, error: Error) => {
  if (isUnauthorizedError(error)) return failureCount < 1;
  return failureCount < 3;
};

const retryUnlessUnauthorized = (failureCount: number, error: Error) => {
  if (isUnauthorizedError(error)) return false;
  return failureCount < 3;
};

export const useUserMetadata = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["user-metadata"],
    queryFn: client.users.getUserMetadata,
    retry: retryUserMetadata,
  });
};

export const useAuthenticatedUser = (onUnauthorized?: () => void) => {
  const query = useUserMetadata();

  useEffect(() => {
    if (isUnauthorizedError(query.error)) onUnauthorized?.();
  }, [onUnauthorized, query.error]);

  return query;
};

export const useUserCreditGrants = (
  params: GetUserCreditGrantsParams = {},
  enabled = true,
) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["user-credit-grants", params],
    queryFn: () => client.users.getUserCreditGrants(params),
    enabled,
  });
};

export const useUserSettings = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: client.users.getUserSettings,
    retry: retryUnlessUnauthorized,
  });
};

export const useUpdateUserSettings = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.updateUserSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["user-settings"], settings);
    },
  });
};

export const useUserConfigs = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["user-configs"],
    queryFn: client.users.getUserConfigs,
    retry: retryUnlessUnauthorized,
  });
};

export const useUserConfig = (configType: UserConfigType, enabled: boolean) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["user-config", configType],
    queryFn: () => client.users.getUserConfig(configType),
    enabled,
    staleTime: Infinity,
    retry: retryUnlessUnauthorized,
  });
};

export const useCreateUserConfig = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.createUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};

export const useUpdateUserConfig = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.updateUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};
