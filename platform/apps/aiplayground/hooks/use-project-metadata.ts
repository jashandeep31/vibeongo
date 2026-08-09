import {
  getInstanceRegions,
  getInstanceTypes,
  getSandboxRegions,
  getSandboxTypes,
} from "@/services/project-metadata-services";
import { useQuery } from "@tanstack/react-query";

export const useInstanceRegions = () =>
  useQuery({
    queryKey: ["instance-regions"],
    queryFn: getInstanceRegions,
  });

export const useInstanceTypes = (regionId: string) =>
  useQuery({
    queryKey: ["instance-types", regionId],
    queryFn: () => getInstanceTypes(regionId),
    enabled: Boolean(regionId),
  });

export const useSandboxRegions = () =>
  useQuery({
    queryKey: ["sandbox-regions"],
    queryFn: getSandboxRegions,
  });

export const useSandboxTypes = (regionId: string) =>
  useQuery({
    queryKey: ["sandbox-types", regionId],
    queryFn: () => getSandboxTypes(regionId),
    enabled: Boolean(regionId),
  });
