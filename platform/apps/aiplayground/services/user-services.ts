import { BACKEND_URL } from "@/lib/constants";
import { users, userWallet } from "@repo/db";
import axios from "axios";

type UserRow = typeof users.$inferSelect;

export type UserMetadata = Pick<UserRow, "id" | "username"> & {
  balance: (typeof userWallet.$inferSelect)["balance"];
  firstName: UserRow["first_name"];
  lastName: UserRow["last_name"];
};

export const getUserMetadata = async (): Promise<UserMetadata> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/users/metadata`, {
    withCredentials: true,
  });

  return response.data.data;
};
