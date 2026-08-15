export const INSTANCE_EXPIRY_WARNING_MS = 10 * 60 * 1000;

type ExpiryValue = Date | number | string | null | undefined;

export function getInstanceRemainingMs(value: ExpiryValue, now: number) {
  if (value === null || value === undefined) return null;
  const terminatesAt =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(terminatesAt)) return null;
  return terminatesAt - now;
}

export function isInstanceExpiringSoon(remainingMs: number | null) {
  return (
    remainingMs !== null &&
    remainingMs > 0 &&
    remainingMs <= INSTANCE_EXPIRY_WARNING_MS
  );
}

export function formatInstanceTimeRemaining(remainingMs: number | null) {
  if (remainingMs === null) return "Unavailable";
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
