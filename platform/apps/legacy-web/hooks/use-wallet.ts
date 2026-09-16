import {
  addCredits,
  GetWalletParams,
  getWallet,
} from "@/services/wallet-services";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useGetWallet = (params: GetWalletParams = {}) =>
  useQuery({
    queryKey: ["wallet", params],
    queryFn: () => getWallet(params),
  });

export const useAddCredits = () =>
  useMutation({
    mutationFn: addCredits,
  });
