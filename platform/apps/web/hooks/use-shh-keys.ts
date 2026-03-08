import { getSshKeys } from "@/services/shh-services";
import { useQuery } from "@tanstack/react-query";

export const useSshKeys = () =>
  useQuery({
    queryKey: ["ssh-keys"],
    queryFn: getSshKeys,
  });
