"use client";

import { userWalletTopUp } from "@/actions/user-actions";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type UserWalletTopUpDialogProps = {
  userId: string;
  userEmail: string;
};

const MIN_TOP_UP_AMOUNT = 1;

export function UserWalletTopUpDialog({
  userId,
  userEmail,
}: UserWalletTopUpDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedAmount = useMemo(() => Number(amount), [amount]);
  const amountError = useMemo(() => {
    if (!amount) return "Amount is required.";
    if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_TOP_UP_AMOUNT) {
      return `Amount must be at least $${MIN_TOP_UP_AMOUNT}.`;
    }

    return null;
  }, [amount, parsedAmount]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setAmount("");
      setError(null);
    }
  };

  const handleAmountChange = (value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (amountError) {
      setError(amountError);
      return;
    }

    startTransition(async () => {
      try {
        await userWalletTopUp(userId, parsedAmount);
        handleOpenChange(false);
        router.refresh();
      } catch (caughtError) {
        console.error(caughtError);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to top up wallet.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Top up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            Add promotional wallet credits for {userEmail}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor={`wallet-top-up-${userId}`}>Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id={`wallet-top-up-${userId}`}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="10.00"
              className="pl-7"
            />
          </div>
          {(error || (amount && amountError)) && (
            <p className="text-xs text-destructive">{error ?? amountError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || Boolean(amountError)}
          >
            {isPending ? "Adding..." : "Add credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
