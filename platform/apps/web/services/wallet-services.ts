import { BACKEND_URL } from "@/lib/constants";
import { userWallet, userWalletTransactions } from "@repo/db";
import axios from "axios";

export type Wallet = typeof userWallet.$inferSelect;
export type WalletTransaction = typeof userWalletTransactions.$inferSelect;

export type GetWalletParams = {
  page?: number;
  limit?: number;
  transactions?: boolean;
};

export type WalletResponse = {
  data: {
    wallet?: Wallet;
    transactions: WalletTransaction[];
  };
  page?: number;
  hasNext?: boolean;
};

export const getWallet = async ({
  page,
  limit,
  transactions,
}: GetWalletParams = {}): Promise<WalletResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/payments`, {
    params: {
      page,
      limit,
      transactions,
    },
    withCredentials: true,
  });
  return res.data;
};

export const addCredits = async (
  amount: number,
): Promise<{
  checkoutUrl: string;
}> => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/payments/add-credits`,
    {
      amount,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};
