import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

export function LowBalanceAlert({
  balance,
  className = "",
}: {
  balance: number | undefined;
  className?: string;
}) {
  if (balance === undefined || balance >= LOW_BALANCE_THRESHOLD) return null;
  const hasNoBalance = balance <= 0;

  return (
    <div
      role="alert"
      className={`flex min-h-12 items-center justify-between gap-3 px-4 text-sm ${
        hasNoBalance
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      } ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <TriangleAlert className="size-4 shrink-0" />
        <span>
          {hasNoBalance
            ? "No credits remaining. Add credits to start sessions and use AI."
            : "Your wallet balance is low. Sessions may fail to start."}
        </span>
      </span>
      <Link
        href="/wallet"
        className="shrink-0 font-medium underline underline-offset-4"
      >
        Add credits
      </Link>
    </div>
  );
}
