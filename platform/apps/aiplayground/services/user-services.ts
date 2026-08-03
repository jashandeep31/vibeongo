import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export type UserMetadata = {
  id: string;
  balance: number;
  username: string;
  firstName: string;
  lastName: string | null;
};

export const getUserMetadata = async (): Promise<UserMetadata> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/users/metadata`,
    { withCredentials: true },
  );

  return response.data.data;
};
