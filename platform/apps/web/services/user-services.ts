import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const getUserMetadata = async (): Promise<{
  id: string;
  balance: number;
}> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/metadata`, {
    withCredentials: true,
  });
  return res.data.data;
};
