import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";

export const logout = async (): Promise<{ message: string }> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/auth/logout`, {
    withCredentials: true,
  });

  return response.data;
};
