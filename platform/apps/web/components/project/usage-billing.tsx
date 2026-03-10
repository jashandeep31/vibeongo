"use client";

import { Clock, CreditCard, Network, Server } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Project } from "./types";

interface UsageBillingProps {
  project: Project;
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
              {project.metrics.billing.total}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Current billing cycle
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" /> Compute
              </span>
              <span className="font-medium">
                {project.metrics.billing.compute}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Network className="h-4 w-4" /> Bandwidth
              </span>
              <span className="font-medium">
                {project.metrics.billing.bandwidth}
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-1 flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Running Time
            </p>
            <p className="font-medium">{project.metrics.uptime}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
