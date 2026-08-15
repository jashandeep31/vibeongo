import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

type GetWalletParams = NonNullable<
  Parameters<ApiClient["wallet"]["getWallet"]>[0]
>;

export const useGetWallet = (params: GetWalletParams = {}) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["wallet", params],
    queryFn: () => client.wallet.getWallet(params),
  });
};

export const useAddCredits = (clientType: "web-app" | "mobile-app") => {
  const client = useApiClient();
  return useMutation({
    mutationFn: (amount: number) =>
      client.wallet.addCredits({ amount, client: clientType }),
  });
};
