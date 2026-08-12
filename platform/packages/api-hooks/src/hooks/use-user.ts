import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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

export const useUserMetadata = (client: ApiClient) =>
  useQuery({
    queryKey: ["user-metadata"],
    queryFn: client.users.getUserMetadata,
    retry: retryUserMetadata,
  });

export const useAuthenticatedUser = (
  client: ApiClient,
  onUnauthorized?: () => void,
) => {
  const query = useUserMetadata(client);

  useEffect(() => {
    if (isUnauthorizedError(query.error)) onUnauthorized?.();
  }, [onUnauthorized, query.error]);

  return query;
};

export const useUserCreditGrants = (
  client: ApiClient,
  params: GetUserCreditGrantsParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["user-credit-grants", params],
    queryFn: () => client.users.getUserCreditGrants(params),
    enabled,
  });

export const useUserSettings = (client: ApiClient) =>
  useQuery({
    queryKey: ["user-settings"],
    queryFn: client.users.getUserSettings,
    retry: retryUnlessUnauthorized,
  });

export const useUpdateUserSettings = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.updateUserSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["user-settings"], settings);
    },
  });
};

export const useUserConfigs = (client: ApiClient) =>
  useQuery({
    queryKey: ["user-configs"],
    queryFn: client.users.getUserConfigs,
    retry: retryUnlessUnauthorized,
  });

export const useUserConfig = (
  client: ApiClient,
  configType: UserConfigType,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["user-config", configType],
    queryFn: () => client.users.getUserConfig(configType),
    enabled,
    staleTime: Infinity,
    retry: retryUnlessUnauthorized,
  });

export const useCreateUserConfig = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.createUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};

export const useUpdateUserConfig = (client: ApiClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.users.updateUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};
