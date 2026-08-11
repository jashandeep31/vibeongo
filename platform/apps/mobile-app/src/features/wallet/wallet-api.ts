import { ApiError, apiFetch, apiRequest } from "@/lib/api";

export const WALLET_PAGE_SIZE = 10;
export const INTERNAL_MONEY_SCALE = 10_000_000;

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  transaction_type: "deposit" | "spent" | "withdrawal";
  wallet_id: string;
  description: string;
  amount: number;
  user_wallet_credit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditGrant = {
  id: string;
  total_balance: number;
  balance: number;
  user_id: string;
  description: string | null;
  wallet_id: string | null;
  expires_at: string;
  expired: boolean;
  created_at: string;
  updated_at: string;
};

export type WalletPage = {
  wallet?: Wallet;
  transactions: WalletTransaction[];
  page: number;
  hasNext: boolean;
};

export type CreditGrantPage = {
  grants: CreditGrant[];
  page: number;
  hasNext: boolean;
};

export async function getWallet(
  page: number,
  signal?: AbortSignal,
): Promise<WalletPage> {
  const params = new URLSearchParams({
    limit: String(WALLET_PAGE_SIZE),
    page: String(page),
    transactions: "true",
  });
  const response = await apiFetch(`/api/v1/users/wallet?${params}`, { signal });
  const body = (await response.json().catch(() => null)) as {
    data?: { wallet?: Wallet; transactions?: WalletTransaction[] };
    error?: string;
    hasNext?: boolean;
    message?: string;
    page?: number;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }
  if (!body?.data || !Array.isArray(body.data.transactions)) {
    throw new ApiError(
      "The server returned an invalid wallet response.",
      response.status,
    );
  }

  return {
    wallet: body.data.wallet,
    transactions: body.data.transactions,
    page: body.page ?? page,
    hasNext: body.hasNext ?? false,
  };
}

export function getCreditGrants(page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    limit: String(WALLET_PAGE_SIZE),
    page: String(page),
  });
  return apiRequest<CreditGrantPage>(
    `/api/v1/users/credit-grants?${params}`,
    {},
    signal,
  );
}

export async function createCheckout(amount: number) {
  const response = await apiFetch("/api/v1/payments/add-credits", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
  const body = (await response.json().catch(() => null)) as {
    checkoutUrl?: string;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }
  if (!body?.checkoutUrl) {
    throw new ApiError("The checkout URL was missing.", response.status);
  }
  return body.checkoutUrl;
}

export function formatInternalMoney(amount: number, fractionDigits = 7) {
  return (amount / INTERNAL_MONEY_SCALE).toFixed(fractionDigits);
}
