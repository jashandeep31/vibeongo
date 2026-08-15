import type { userWallet, userWalletTransactions } from "@repo/db";
import type { AxiosInstance } from "axios";

export type GetWalletParams = {
  page?: number;
  limit?: number;
  transactions?: boolean;
};

export const getWallet =
  (apiClient: AxiosInstance) =>
  async ({ page, limit, transactions }: GetWalletParams = {}): Promise<{
    data: {
      wallet?: typeof userWallet.$inferSelect;
      transactions: (typeof userWalletTransactions.$inferSelect)[];
    };
    page?: number;
    hasNext?: boolean;
  }> => {
    const response = await apiClient.get(`/api/v1/users/wallet`, {
      params: { page, limit, transactions },
      withCredentials: true,
    });
    return response.data;
  };

export const addCredits =
  (apiClient: AxiosInstance) =>
  async (amount: number): Promise<{ checkoutUrl: string }> => {
    const response = await apiClient.post(
      `/api/v1/payments/add-credits`,
      { amount },
      { withCredentials: true },
    );
    return response.data;
  };
