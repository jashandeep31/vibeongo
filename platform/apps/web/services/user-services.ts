import { BACKEND_URL } from "@/lib/constants";
import { userCreditGrants, userSettings } from "@repo/db";
import axios from "axios";

export type UserCreditGrant = typeof userCreditGrants.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;

export type GetUserCreditGrantsParams = {
  page?: number;
  limit?: number;
};

export type UserCreditGrantsResponse = {
  grants: UserCreditGrant[];
  page: number;
  hasNext: boolean;
};

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

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/settings`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserCreditGrants = async ({
  page,
  limit,
}: GetUserCreditGrantsParams = {}): Promise<UserCreditGrantsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/credit-grants`, {
    params: {
      page,
      limit,
    },
    withCredentials: true,
  });
  return res.data.data;
};
