"use client";

import { BuyCreditsDialog } from "@/components/dialogs/buy-credits-dialog";
import { useUserCreditGrants } from "@/hooks/use-user";
import { useGetWallet } from "@/hooks/use-wallet";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { formatInternalMoney } from "@repo/shared";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

const PAGE_LIMIT = 10;
type WalletTab = "transactions" | "credit-grants";

const formatDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function PageControls({
  page,
  hasNext,
  isLoading,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={isLoading || page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeft />
      </Button>
      <span className="text-muted-foreground min-w-16 text-center text-sm">
        Page {page}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={isLoading || !hasNext}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<WalletTab>("transactions");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [creditGrantsPage, setCreditGrantsPage] = useState(1);
  const walletQuery = useGetWallet({
    page: transactionsPage,
    limit: PAGE_LIMIT,
    transactions: true,
  });
  const creditGrantsQuery = useUserCreditGrants(
    { page: creditGrantsPage, limit: PAGE_LIMIT },
    activeTab === "credit-grants",
  );
  const wallet = walletQuery.data?.data.wallet;
  const transactions = walletQuery.data?.data.transactions ?? [];
  const grants = creditGrantsQuery.data?.grants.slice(0, PAGE_LIMIT) ?? [];
  const currentTransactionsPage = walletQuery.data?.page ?? transactionsPage;
  const currentCreditGrantsPage =
    creditGrantsQuery.data?.page ?? creditGrantsPage;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <header>
        <p className="text-muted-foreground text-sm">Usage and credits</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Review your balance, purchases, usage, and promotional credits.
        </p>
      </header>

      <section className="mt-12 flex flex-col gap-6 border-y py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <WalletCards className="size-4" />
            Available balance
          </div>
          {walletQuery.isLoading ? (
            <Skeleton className="mt-3 h-11 w-52" />
          ) : walletQuery.isError ? (
            <p className="text-destructive mt-3 text-sm">
              Failed to load wallet balance.
            </p>
          ) : (
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              ${formatInternalMoney(wallet?.balance ?? 0, 2)}
              <span className="text-muted-foreground ml-2 text-base font-normal">
                credits
              </span>
            </p>
          )}
        </div>
        <BuyCreditsDialog />
      </section>

      <section className="mt-10">
        <div className="flex gap-6 border-b">
          {(
            [
              { value: "transactions", label: "Transactions" },
              { value: "credit-grants", label: "Credit grants" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "transactions" ? (
          <div className="mt-5">
            <div className="overflow-x-auto">
              <Table className="min-w-180">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                    <TableHead className="w-44">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {walletQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-5 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-64" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : walletQuery.isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-destructive h-28 text-center"
                      >
                        Failed to load transactions.
                      </TableCell>
                    </TableRow>
                  ) : transactions.length ? (
                    transactions.map((transaction) => {
                      const isDeposit =
                        transaction.transaction_type === "deposit";
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge
                              variant={isDeposit ? "secondary" : "outline"}
                              className="capitalize"
                            >
                              {transaction.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {transaction.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {isDeposit ? "+" : "−"}$
                            {formatInternalMoney(transaction.amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(transaction.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <CreditCard className="text-muted-foreground mx-auto mb-3 size-7" />
                        <span className="text-muted-foreground text-sm">
                          No transactions found.
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <PageControls
              page={currentTransactionsPage}
              hasNext={walletQuery.data?.hasNext ?? false}
              isLoading={walletQuery.isLoading}
              onChange={setTransactionsPage}
            />
          </div>
        ) : (
          <div className="mt-5">
            <div className="overflow-x-auto">
              <Table className="min-w-220">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32 text-right">Remaining</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-44">Issued</TableHead>
                    <TableHead className="w-44">Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditGrantsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-60" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : creditGrantsQuery.isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-destructive h-28 text-center"
                      >
                        Failed to load credit grants.
                      </TableCell>
                    </TableRow>
                  ) : grants.length ? (
                    grants.map((grant) => {
                      const expired =
                        grant.expired ||
                        new Date(grant.expires_at).getTime() <= Date.now();
                      const status = expired
                        ? "Expired"
                        : grant.balance > 0
                          ? "Active"
                          : "Used";
                      return (
                        <TableRow key={grant.id}>
                          <TableCell className="whitespace-normal">
                            {grant.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            ${formatInternalMoney(grant.balance)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            ${formatInternalMoney(grant.total_balance)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status === "Active" ? "secondary" : "outline"
                              }
                            >
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(grant.created_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(grant.expires_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Gift className="text-muted-foreground mx-auto mb-3 size-7" />
                        <span className="text-muted-foreground text-sm">
                          No credit grants found.
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <PageControls
              page={currentCreditGrantsPage}
              hasNext={creditGrantsQuery.data?.hasNext ?? false}
              isLoading={creditGrantsQuery.isLoading}
              onChange={setCreditGrantsPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
