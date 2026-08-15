import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const useInstanceRegions = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["instance-regions"],
    queryFn: client.projectMetadata.getInstanceRegions,
  });
};

export const useInstanceTypes = (regionId: string) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["instance-types", regionId],
    queryFn: () => client.projectMetadata.getInstanceTypes(regionId),
    enabled: Boolean(regionId),
  });
};

export const useSandboxRegions = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["sandbox-regions"],
    queryFn: client.projectMetadata.getSandboxRegions,
  });
};

export const useSandboxTypes = (regionId: string) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["sandbox-types", regionId],
    queryFn: () => client.projectMetadata.getSandboxTypes(regionId),
    enabled: Boolean(regionId),
  });
};
