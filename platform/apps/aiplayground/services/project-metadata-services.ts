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
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/instances/regions`,
  );
  return response.data.data;
};

export const getInstanceTypes = async (
  regionId: string,
): Promise<(typeof instanceTypes.$inferSelect)[]> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/instances/regions/${regionId}/types`,
  );
  return response.data.data;
};

export const getSandboxRegions = async (): Promise<
  (typeof sandboxRegions.$inferSelect)[]
> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/sandboxes/regions`,
  );
  return response.data.data;
};

export const getSandboxTypes = async (
  regionId: string,
): Promise<(typeof sandboxTypes.$inferSelect)[]> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/metadata/sandboxes/regions/${regionId}/types`,
  );
  return response.data.data;
};
