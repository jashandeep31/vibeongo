import { BACKEND_URL } from "../index.js";
import type { userWallet, userWalletTransactions } from "@repo/db";
import axios from "axios";

export type GetWalletParams = {
  page?: number;
  limit?: number;
  transactions?: boolean;
};

export const getWallet = async ({
  page,
  limit,
  transactions,
}: GetWalletParams = {}): Promise<{
  data: {
    wallet?: typeof userWallet.$inferSelect;
    transactions: (typeof userWalletTransactions.$inferSelect)[];
  };
  page?: number;
  hasNext?: boolean;
}> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/users/wallet`, {
    params: { page, limit, transactions },
    withCredentials: true,
  });
  return response.data;
};

export const addCredits = async (
  amount: number,
): Promise<{ checkoutUrl: string }> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/payments/add-credits`,
    { amount },
    { withCredentials: true },
  );
  return response.data;
};
