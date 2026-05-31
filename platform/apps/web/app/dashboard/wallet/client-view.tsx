"use client";

import { BuyCreditsDialog } from "@/components/dialogs/buy-credits-dialog";
import { useGetWallet } from "@/hooks/use-wallet";
import { useState } from "react";
import { Badge } from "@repo/ui/components/badge";
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
import { CreditCard } from "lucide-react";

const TRANSACTIONS_LIMIT = 10;

const formatCredits = (amount: number) => (amount / 10000).toFixed(2);

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
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetWallet({
    page,
    limit: TRANSACTIONS_LIMIT,
    transactions: true,
  });

  const wallet = data?.data.wallet;
  const transactions = data?.data.transactions ?? [];
  // Note: wallet returns the precision so divide by 10**4
  const walletBalance = formatCredits(wallet?.balance ?? 0);
  const currentPage = data?.page ?? page;
  const hasNext = data?.hasNext ?? false;
  const previousDisabled = isLoading || currentPage <= 1;
  const nextDisabled = isLoading || !hasNext;

  return (
    <div className="p-8">
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

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-lg font-semibold">
            Transactions
          </h2>
        </div>

        <div className="mt-6 grid overflow-auto rounded-lg border">
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
                  const isDeposit = transaction.transaction_type === "deposit";
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
                      <TableCell className="whitespace-normal break-words">
                        {transaction.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {amountPrefix}${formatCredits(transaction.amount)}
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
                aria-disabled={previousDisabled}
                className={
                  previousDisabled ? "pointer-events-none opacity-50" : ""
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (previousDisabled) return;
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground flex h-9 items-center px-3 text-sm">
                Page {currentPage}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={nextDisabled}
                className={nextDisabled ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (nextDisabled) return;
                  setPage((current) => current + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
