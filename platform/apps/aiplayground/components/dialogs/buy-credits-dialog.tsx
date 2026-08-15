"use client";

import { useAddCredits } from "@repo/api-hooks";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MIN_CREDIT_AMOUNT = 5;
const MAX_CREDIT_AMOUNT = 300;

export function BuyCreditsDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(MIN_CREDIT_AMOUNT));
  const addCredits = useAddCredits();
  const parsedAmount = Number(amount);
  const isValid =
    Number.isInteger(parsedAmount) &&
    parsedAmount >= MIN_CREDIT_AMOUNT &&
    parsedAmount <= MAX_CREDIT_AMOUNT;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && addCredits.isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) setAmount(String(MIN_CREDIT_AMOUNT));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const { checkoutUrl } = await addCredits.mutateAsync(parsedAmount);
      toast.success("Redirecting to checkout");
      window.location.assign(checkoutUrl);
    } catch {
      toast.error("Failed to create checkout session");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus /> Buy credits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy credits</DialogTitle>
          <DialogDescription>
            Add between ${MIN_CREDIT_AMOUNT} and ${MAX_CREDIT_AMOUNT} to your
            wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-3">
          <Label htmlFor="wallet-credit-amount">Amount</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id="wallet-credit-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => {
                if (/^\d*$/.test(event.target.value))
                  setAmount(event.target.value);
              }}
              className="pl-7"
              disabled={addCredits.isPending}
            />
          </div>
          {!isValid ? (
            <p className="text-destructive text-xs">
              Enter a whole amount from ${MIN_CREDIT_AMOUNT} to $
              {MAX_CREDIT_AMOUNT}.
            </p>
          ) : null}
        </div>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || addCredits.isPending}
          >
            {addCredits.isPending ? "Creating checkout..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
