import {
  getInstanceRegions,
  getInstanceTypesByRegionId,
  getSandboxRegions,
  getSandboxTypesByRegionId,
} from "@/services/instance-metadata-service";
import {
  instanceRegions,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
} from "@repo/db";
import { useQuery } from "@tanstack/react-query";

export const useInstanceRegions = () =>
  useQuery<(typeof instanceRegions.$inferSelect)[]>({
    queryKey: ["instance-regions"],
    queryFn: getInstanceRegions,
  });

export const useInstanceTypesByRegionID = ({
  regionId,
}: {
  regionId: string | null;
}) =>
  useQuery<(typeof instanceTypes.$inferSelect)[]>({
    queryKey: ["instance-types", regionId],
    queryFn: () => getInstanceTypesByRegionId({ regionId: regionId! }),
    enabled: !!regionId,
  });

export const useSandboxRegions = () =>
  useQuery<(typeof sandboxRegions.$inferSelect)[]>({
    queryKey: ["sandbox-regions"],
    queryFn: getSandboxRegions,
  });

export const useSandboxTypesByRegionId = ({
  regionId,
}: {
  regionId: string | null;
}) =>
  useQuery<(typeof sandboxTypes.$inferSelect)[]>({
    queryKey: ["sandbox-types", regionId],
    queryFn: () => getSandboxTypesByRegionId({ regionId: regionId! }),
    enabled: !!regionId,
  });
