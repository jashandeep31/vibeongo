import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";
import { instanceRegionsEnum } from "@repo/db";

export const getInstanceRegions = async (): Promise<
  typeof instanceRegionsEnum.enumValues
> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instance-metadata/region`);
  return res.data.data;
};
