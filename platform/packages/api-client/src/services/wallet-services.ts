import type { userWallet, userWalletTransactions } from "@repo/db";
import type { AxiosInstance } from "axios";

export type GetWalletParams = {
  page?: number;
  limit?: number;
  transactions?: boolean;
};

export type AddCreditsParams = {
  amount: number;
  client: "web-app" | "mobile-app";
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
  async (
    { amount, client }: AddCreditsParams,
  ): Promise<{ checkoutUrl: string }> => {
    const response = await apiClient.post(
      `/api/v1/payments/add-credits`,
      { amount, client },
      { withCredentials: true },
    );
    return response.data;
  };
