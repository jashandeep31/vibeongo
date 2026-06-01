"use client";

import { CreditCard, Server } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Project, DbInstance } from "./types";

interface UsageBillingProps {
  project: Project;
  instances: DbInstance[];
}

export function UsageBilling({ project }: UsageBillingProps) {
  return (
    <div className="space-y-6">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <CreditCard className="text-muted-foreground h-5 w-5" />
        Usage & Billing
      </h2>
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              Total Charges
            </p>
            <p className="text-3xl font-bold">
              ${(project.total_charges / 10000).toFixed(4)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Current billing cycle
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
