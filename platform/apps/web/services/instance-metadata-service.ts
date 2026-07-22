import { BACKEND_URL } from "@/lib/constants";
import { instanceRegions, instanceTypes } from "@repo/db";
import axios from "axios";

export const getInstanceRegions = async (): Promise<
  (typeof instanceRegions.$inferSelect)[]
> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/instances/regions`,
  );
  return res.data.data;
};

export const getInstanceTypesByRegionId = async ({
  regionId,
}: {
  regionId: string;
}): Promise<(typeof instanceTypes.$inferSelect)[]> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/instances/regions/${regionId}/types`,
  );
  return res.data.data;
};
