import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const useProviderCredentials = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["provider-credentials"],
    queryFn: () => client.providerCredentials.getProviderCredentials(),
  });
};
