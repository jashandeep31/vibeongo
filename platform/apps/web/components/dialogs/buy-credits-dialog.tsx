"use client";

import { useState } from "react";
import { useAddCredits } from "@/hooks/use-wallet";
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
import { z } from "@repo/shared";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";

const MIN_CREDIT_AMOUNT = 5;
const MAX_CREDIT_AMOUNT = 300;

const buyCreditsSchema = z.object({
  amount: z.coerce
    .number()
    .int("Amount must be a whole dollar amount.")
    .min(MIN_CREDIT_AMOUNT, `Amount must be at least $${MIN_CREDIT_AMOUNT}.`)
    .max(MAX_CREDIT_AMOUNT, `Amount must be no more than $${MAX_CREDIT_AMOUNT}.`),
});

export function BuyCreditsDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(MIN_CREDIT_AMOUNT));
  const addCreditsMutation = useAddCredits();

  const parsedAmount = buyCreditsSchema.safeParse({ amount });
  const amountError = parsedAmount.success
    ? null
    : parsedAmount.error.issues[0]?.message;

  const handleSubmit = async () => {
    if (!parsedAmount.success) {
      return;
    }

    const toastId = toast.loading("Creating checkout session...");
    try {
      const { checkoutUrl } = await addCreditsMutation.mutateAsync(
        parsedAmount.data.amount,
      );
      toast.success("Redirecting to checkout", { id: toastId });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      toast.error("Failed to create checkout session", { id: toastId });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setAmount(String(MIN_CREDIT_AMOUNT));
    }
  };

  const handleAmountChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="lg">
          <PlusCircle className="h-4 w-4" />
          Buy Credits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Buy Credits</DialogTitle>
          <DialogDescription>
            Enter the dollar amount you want to add to your wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Label htmlFor="creditAmount">Amount</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id="creditAmount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={String(MAX_CREDIT_AMOUNT).length}
              value={amount}
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder={String(MIN_CREDIT_AMOUNT)}
              className="pl-7"
            />
          </div>
          {amountError && (
            <p className="text-destructive text-xs">{amountError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!parsedAmount.success || addCreditsMutation.isPending}
          >
            {addCreditsMutation.isPending ? "Creating..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
