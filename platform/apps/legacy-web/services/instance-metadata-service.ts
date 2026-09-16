import { BACKEND_URL } from "@/lib/constants";
import {
  instanceRegions,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
} from "@repo/db";
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

export const getSandboxRegions = async (): Promise<
  (typeof sandboxRegions.$inferSelect)[]
> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/sandboxes/regions`,
  );
  return res.data.data;
};

export const getSandboxTypesByRegionId = async ({
  regionId,
}: {
  regionId: string;
}): Promise<(typeof sandboxTypes.$inferSelect)[]> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/sandboxes/regions/${regionId}/types`,
  );
  return res.data.data;
};
