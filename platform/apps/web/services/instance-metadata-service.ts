import { BACKEND_URL } from "@/lib/constants";
import { instanceRegions } from "@repo/db";
import axios from "axios";

export const getInstanceRegions = async (): Promise<
  (typeof instanceRegions.$inferSelect)[]
> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instance-metadata/region`);
  return res.data.data;
};
