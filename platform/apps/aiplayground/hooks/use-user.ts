import {
  createUserConfig,
  getUserConfig,
  getUserConfigs,
  getUserCreditGrants,
  getUserMetadata,
  getUserSettings,
  updateUserConfig,
  updateUserSettings,
  type GetUserCreditGrantsParams,
} from "@/services/user-services";
import type { userConfigs } from "@repo/db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const isUnauthorizedError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;

const retryUserMetadata = (failureCount: number, error: Error) => {
  if (isUnauthorizedError(error)) {
    // TanStack passes 0 for the first failure, so this permits one retry and
    // exposes the error after the second 401 response.
    return failureCount < 1;
  }

  return failureCount < 3;
};

export const useUserMetadata = () =>
  useQuery({
    queryKey: ["user-metadata"],
    queryFn: getUserMetadata,
    retry: retryUserMetadata,
  });

export const useAuthenticatedUser = () => {
  const router = useRouter();
  const query = useUserMetadata();

  useEffect(() => {
    if (isUnauthorizedError(query.error)) {
      router.replace("/login");
    }
  }, [query.error, router]);

  return query;
};

const retryUnlessUnauthorized = (failureCount: number, error: Error) => {
  if (isUnauthorizedError(error)) return false;
  return failureCount < 3;
};

export const useUserCreditGrants = (
  params: GetUserCreditGrantsParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["user-credit-grants", params],
    queryFn: () => getUserCreditGrants(params),
    enabled,
  });

export const useUserSettings = () =>
  useQuery({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
    retry: retryUnlessUnauthorized,
  });

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["user-settings"], settings);
    },
  });
};

export const useUserConfigs = () =>
  useQuery({
    queryKey: ["user-configs"],
    queryFn: getUserConfigs,
    retry: retryUnlessUnauthorized,
  });

export const useUserConfig = (
  configType: (typeof userConfigs.$inferSelect)["config_type"],
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["user-config", configType],
    queryFn: () => getUserConfig(configType),
    enabled,
    staleTime: Infinity,
    retry: retryUnlessUnauthorized,
  });

export const useCreateUserConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};

export const useUpdateUserConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserConfig,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-configs"] }),
  });
};
