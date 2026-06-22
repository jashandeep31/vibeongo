import {
  GetUserCreditGrantsParams,
  getUserCreditGrants,
  getUserMetadata,
  getUserSettings,
} from "@/services/user-services";
import { useQuery } from "@tanstack/react-query";
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
