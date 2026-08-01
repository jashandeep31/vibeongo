/** All internal monetary values are stored in ten-millionths of a currency unit. */
export const INTERNAL_MONEY_SCALE = 10_000_000;

/** Dodo Payments sends and accepts amounts in the currency's smallest unit. */
export const PAYMENT_GATEWAY_SCALE = 100;

export const PAYMENT_GATEWAY_TO_INTERNAL_SCALE =
  INTERNAL_MONEY_SCALE / PAYMENT_GATEWAY_SCALE;

export const formatInternalMoney = (
  amount: number,
  fractionDigits = 7,
): string => (amount / INTERNAL_MONEY_SCALE).toFixed(fractionDigits);
