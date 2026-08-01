import {
  createUserConfig,
  GetUserCreditGrantsParams,
  getUserCreditGrants,
  getUserConfig,
  getUserConfigs,
  getUserMetadata,
  getUserSettings,
  updateUserConfig,
  updateUserSettings,
  UserConfigType,
} from "@/services/user-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const useUserCreditGrants = (
  params: GetUserCreditGrantsParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["user-credit-grants", params],
    queryFn: () => getUserCreditGrants(params),
    enabled,
  });

export const useUserMetadata = () =>
  useQuery({
    queryKey: ["user-metadata"],
    queryFn: getUserMetadata,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }

      return failureCount < 3;
    },
  });

export const useUserSettings = () =>
  useQuery({
    queryKey: ["user-settings"],
    queryFn: getUserSettings,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }

      return failureCount < 3;
    },
  });

export const useUserConfigs = () =>
  useQuery({
    queryKey: ["user-configs"],
    queryFn: getUserConfigs,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }

      return failureCount < 3;
    },
  });

export const useUserConfig = (configType: UserConfigType, enabled: boolean) =>
  useQuery({
    queryKey: ["user-config", configType],
    queryFn: () => getUserConfig(configType),
    enabled,
    staleTime: Infinity,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }

      return failureCount < 3;
    },
  });

export const useCreateUserConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-configs"] });
    },
  });
};

export const useUpdateUserConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-configs"] });
    },
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["user-settings"], settings);
    },
  });
};
