import {
  getInstanceRegions,
  getInstanceTypesByRegionId,
} from "@/services/instance-metadata-service";
import { useQuery } from "@tanstack/react-query";

export const useInstanceRegions = () =>
  useQuery({
    queryKey: ["instance-regions"],
    queryFn: getInstanceRegions,
  });

export const useInstanceTypesByRegionID = ({
  regionId,
}: {
  regionId: string | null;
}) =>
  useQuery({
    queryKey: ["instance-types", regionId],
    queryFn: () => getInstanceTypesByRegionId({ regionId: regionId! }),
    enabled: !!regionId,
  });
