import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";

type GetWalletParams = NonNullable<
  Parameters<ApiClient["wallet"]["getWallet"]>[0]
>;

export const useGetWallet = (client: ApiClient, params: GetWalletParams = {}) =>
  useQuery({
    queryKey: ["wallet", params],
    queryFn: () => client.wallet.getWallet(params),
  });

export const useAddCredits = (client: ApiClient) =>
  useMutation({ mutationFn: client.wallet.addCredits });
