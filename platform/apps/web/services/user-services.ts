import { BACKEND_URL } from "@/lib/constants";
import { userCreditGrants } from "@repo/db";
import axios from "axios";

export const getUserMetadata = async (): Promise<{
  id: string;
  balance: number;
  username: string;
  firstName: string;
  lastName: string | null;
}> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/metadata`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserCreditGrants = async (): Promise<{
  grants: (typeof userCreditGrants)[];
  page: number;
  hasNext: boolean;
}> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/credit-grants`, {});
  return res.data.data;
};
