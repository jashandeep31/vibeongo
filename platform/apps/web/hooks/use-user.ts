import { getUserMetadata } from "@/services/user-services";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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
