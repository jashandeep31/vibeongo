"use client";

import { BuyCreditsDialog } from "@/components/dialogs/buy-credits-dialog";
import { useUserCreditGrants } from "@/hooks/use-user";
import { useGetWallet } from "@/hooks/use-wallet";
import { useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/pagination";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { CreditCard, Gift } from "lucide-react";

const TRANSACTIONS_LIMIT = 10;
const CREDIT_GRANTS_LIMIT = 10;
type WalletTab = "transactions" | "credit-grants";

const formatWalletCredits = (amount: number) => {
  const realamount = amount / 10000;
  return (Math.trunc(realamount * 100) / 100).toFixed(2);
};

const formatDate = (value: unknown) => {
  if (!value) return "-";

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function ClientView() {
  const [activeTab, setActiveTab] = useState<WalletTab>("transactions");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [creditGrantsPage, setCreditGrantsPage] = useState(1);
  const { data, isLoading } = useGetWallet({
    page: transactionsPage,
    limit: TRANSACTIONS_LIMIT,
    transactions: true,
  });
  const { data: creditGrantsData, isLoading: areCreditGrantsLoading } =
    useUserCreditGrants(
      {
        page: creditGrantsPage,
        limit: CREDIT_GRANTS_LIMIT,
      },
      activeTab === "credit-grants",
    );

  const wallet = data?.data.wallet;
  const transactions = data?.data.transactions ?? [];
  const creditGrants =
    creditGrantsData?.grants.slice(0, CREDIT_GRANTS_LIMIT) ?? [];
  // Note: wallet returns the precision so divide by 10**4
  const walletBalance = formatWalletCredits(wallet?.balance ?? 0);
  const currentTransactionsPage = data?.page ?? transactionsPage;
  const hasNextTransactionPage = data?.hasNext ?? false;
  const previousTransactionsDisabled =
    isLoading || currentTransactionsPage <= 1;
  const nextTransactionsDisabled = isLoading || !hasNextTransactionPage;
  const currentCreditGrantsPage = creditGrantsData?.page ?? creditGrantsPage;
  const hasNextCreditGrantsPage = creditGrantsData?.hasNext ?? false;
  const previousCreditGrantsDisabled =
    areCreditGrantsLoading || currentCreditGrantsPage <= 1;
  const nextCreditGrantsDisabled =
    areCreditGrantsLoading || !hasNextCreditGrantsPage;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your credits and billing balance.
        </p>
      </div>

      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
          <CardAction>
            <div className="bg-primary/10 rounded-lg p-2">
              <CreditCard className="text-primary h-5 w-5" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {isLoading ? (
                <div className="mt-2 space-y-3">
                  <div className="flex items-end gap-2">
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="mb-1 h-5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
              ) : (
                <p className="mt-2 text-lg font-bold tracking-tight lg:text-4xl">
                  ${walletBalance} credits
                </p>
              )}
            </div>

            <BuyCreditsDialog />
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            { value: "transactions", label: "Transactions" },
            { value: "credit-grants", label: "Credit Grants" },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={activeTab === tab.value ? "default" : "outline"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "credit-grants" ? (
        <div className="mt-6">
          <div className="grid overflow-auto rounded-lg border">
            <Table className="min-w-[880px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36 text-right">Remaining</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-44">Issued</TableHead>
                  <TableHead className="w-44">Expires</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {areCreditGrantsLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-full max-w-xl" />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : creditGrants.length > 0 ? (
                  creditGrants.map((grant) => {
                    const isExpired =
                      grant.expired ||
                      new Date(grant.expires_at).getTime() <= Date.now();
                    const status = isExpired
                      ? "Expired"
                      : grant.balance > 0
                        ? "Active"
                        : "Used";

                    return (
                      <TableRow key={grant.id}>
                        <TableCell className="break-words whitespace-normal">
                          {grant.description ?? "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          ${formatWalletCredits(grant.balance)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          ${formatWalletCredits(grant.total_balance)}
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
                      <div className="text-muted-foreground">
                        <Gift className="mx-auto mb-3 h-8 w-8 opacity-50" />
                        <p>No credit grants found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination className="mt-4 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={previousCreditGrantsDisabled}
                  className={
                    previousCreditGrantsDisabled
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (previousCreditGrantsDisabled) return;
                    setCreditGrantsPage((current) => Math.max(1, current - 1));
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-muted-foreground flex h-9 items-center px-3 text-sm">
                  Page {currentCreditGrantsPage}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={nextCreditGrantsDisabled}
                  className={
                    nextCreditGrantsDisabled
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (nextCreditGrantsDisabled) return;
                    setCreditGrantsPage((current) => current + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid overflow-auto rounded-lg border">
            <Table className="min-w-[760px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32 text-right">Amount</TableHead>
                  <TableHead className="w-44">Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full max-w-xl" />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((transaction) => {
                    const isDeposit =
                      transaction.transaction_type === "deposit";
                    const amountPrefix = isDeposit ? "+" : "-";

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
                        <TableCell className="break-words whitespace-normal">
                          {transaction.description ?? "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {amountPrefix}$
                          {(transaction.amount / 10000).toFixed(4)}
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
                      <div className="text-muted-foreground">
                        <CreditCard className="mx-auto mb-3 h-8 w-8 opacity-50" />
                        <p>No transactions found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination className="mt-4 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={previousTransactionsDisabled}
                  className={
                    previousTransactionsDisabled
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (previousTransactionsDisabled) return;
                    setTransactionsPage((current) => Math.max(1, current - 1));
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-muted-foreground flex h-9 items-center px-3 text-sm">
                  Page {currentTransactionsPage}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={nextTransactionsDisabled}
                  className={
                    nextTransactionsDisabled
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (nextTransactionsDisabled) return;
                    setTransactionsPage((current) => current + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
