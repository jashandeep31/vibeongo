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
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-muted-foreground" />
        Usage & Billing
      </h2>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Total Charges
            </p>
            <p className="text-3xl font-bold">
              {project.metrics.billing.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current billing cycle
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Server className="w-4 h-4" /> Compute
              </span>
              <span className="font-medium">
                {project.metrics.billing.compute}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Network className="w-4 h-4" /> Bandwidth
              </span>
              <span className="font-medium">
                {project.metrics.billing.bandwidth}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Running Time
            </p>
            <p className="font-medium">{project.metrics.uptime}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
