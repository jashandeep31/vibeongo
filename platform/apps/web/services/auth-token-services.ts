import { BACKEND_URL } from "@/lib/constants";
import { authTokens } from "@repo/db";
import { createAuthTokenSchema, z } from "@repo/shared";
import axios from "axios";

export type AuthToken = Omit<typeof authTokens.$inferSelect, "secret">;

export interface CreateAuthTokenResponse {
  token: string;
}

export const getAuthTokens = async (): Promise<AuthToken[]> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/auth-tokens`, {
    withCredentials: true,
  });

  return res.data.data;
};

export const createAuthToken = async (
  data: z.infer<typeof createAuthTokenSchema>,
): Promise<CreateAuthTokenResponse> => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/users/auth-tokens`,
    data,
    {
      withCredentials: true,
    },
  );

  return res.data.data;
};

export const deleteAuthToken = async (id: string) => {
  const res = await axios.delete(
    `${BACKEND_URL}/api/v1/users/auth-tokens/${id}`,
    {
      withCredentials: true,
    },
  );

  return res.status;
};
