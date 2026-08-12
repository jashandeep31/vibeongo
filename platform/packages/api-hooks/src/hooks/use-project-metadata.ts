import type { ApiClient } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";

export const useInstanceRegions = (client: ApiClient) =>
  useQuery({
    queryKey: ["instance-regions"],
    queryFn: client.projectMetadata.getInstanceRegions,
  });

export const useInstanceTypes = (client: ApiClient, regionId: string) =>
  useQuery({
    queryKey: ["instance-types", regionId],
    queryFn: () => client.projectMetadata.getInstanceTypes(regionId),
    enabled: Boolean(regionId),
  });

export const useSandboxRegions = (client: ApiClient) =>
  useQuery({
    queryKey: ["sandbox-regions"],
    queryFn: client.projectMetadata.getSandboxRegions,
  });

export const useSandboxTypes = (client: ApiClient, regionId: string) =>
  useQuery({
    queryKey: ["sandbox-types", regionId],
    queryFn: () => client.projectMetadata.getSandboxTypes(regionId),
    enabled: Boolean(regionId),
  });
