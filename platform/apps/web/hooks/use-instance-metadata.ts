import {
  getInstanceRegions,
  getInstanceTypesByRegionId,
} from "@/services/instance-metadata-service";
import { instanceRegions, instanceTypes } from "@repo/db";
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
