import { addCredits, getWallet } from "@/services/wallet-services";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useGetWallet = () =>
  useQuery({
    queryKey: ["wallet"],
    queryFn: getWallet,
  });

export const useAddCredits = () =>
  useMutation({
    mutationFn: addCredits,
  });
