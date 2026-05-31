"use client";

import { BuyCreditsDialog } from "@/components/dialogs/buy-credits-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { CreditCard } from "lucide-react";

export default function ClientView() {
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
              <p className="mt-2 text-4xl font-bold tracking-tight">
                $0 credits
              </p>
            </div>

            <BuyCreditsDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
