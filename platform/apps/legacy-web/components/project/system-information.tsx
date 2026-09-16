"use client";

import { useState } from "react";
import { Check, Copy, HardDrive } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { DbInstance } from "./types";

interface SystemInformationProps {
  instances: DbInstance[];
}

export function SystemInformation({ instances }: SystemInformationProps) {
  const [isCopied, setIsCopied] = useState(false);
  const ipv4 = instances?.[0]?.public_ip || "";

  const handleCopyIpv4 = async () => {
    if (!ipv4) return;

    await navigator.clipboard.writeText(ipv4);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <HardDrive className="text-muted-foreground h-5 w-5" />
        System Information
      </h2>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-1.5">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">IPv4</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!ipv4}
              aria-label="Copy IPv4 address"
              title="Copy IPv4 address"
              className="max-w-full justify-start gap-2"
              onClick={() => {
                void handleCopyIpv4();
              }}
            >
              <span className="truncate font-medium tabular-nums">
                {ipv4 || "Not assigned"}
              </span>
              {isCopied ? (
                <Check className="h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
