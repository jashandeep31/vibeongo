import { useQuery } from "@tanstack/react-query";

export const useGetWallet = () =>
  useQuery({
    queryKey: ["wallet"],
    queryFn: () => {},
  });
