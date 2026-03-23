import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const createInstance = async (
  data: unknown,
): Promise<{ message: string }> => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/instances`, data, {
    withCredentials: true,
  });
  return res.data;
};
