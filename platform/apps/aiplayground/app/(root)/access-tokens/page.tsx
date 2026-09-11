"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Github } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GitProvider = "github" | "forgejo";

type SampleAccessToken = {
  id: string;
  provider: GitProvider;
  providerTokenId: string;
  instanceId: string;
  createdAt: Date;
  expiresAt: Date;
};

const sampleTokens: SampleAccessToken[] = [
  {
    id: "token_01JGH7W9M2",
    provider: "github",
    providerTokenId: "ghs_••••••••7K2P",
    instanceId: "instance_01JGH7Q8YD",
    createdAt: new Date("2026-09-11T10:30:00+05:30"),
    expiresAt: new Date("2026-09-11T18:30:00+05:30"),
  },
  {
    id: "token_01JGH8A4NX",
    provider: "forgejo",
    providerTokenId: "fgj_••••••••3M8R",
    instanceId: "instance_01JGH7Q8YD",
    createdAt: new Date("2026-09-11T10:31:00+05:30"),
    expiresAt: new Date("2026-09-12T10:31:00+05:30"),
  },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AccessTokensPage() {
  const [expiredTokenIds, setExpiredTokenIds] = useState<Set<string>>(
    () => new Set(),
  );

  const expireToken = (token: SampleAccessToken) => {
    setExpiredTokenIds((current) => new Set(current).add(token.id));
    toast.success(
      `${providerName(token.provider)} token expired (sample only)`,
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <main className="mx-auto w-full max-w-6xl space-y-5 px-5 py-8 md:px-8 md:py-10">
        <h1 className="text-xl font-semibold tracking-tight">
          Git access tokens
        </h1>

        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Instance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleTokens.map((token) => {
                const isExpired = expiredTokenIds.has(token.id);

                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium">
                        <ProviderIcon provider={token.provider} />
                        {providerName(token.provider)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {token.providerTokenId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground font-mono text-xs">
                        {token.instanceId}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateFormatter.format(token.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {isExpired
                        ? "Just now"
                        : dateFormatter.format(token.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isExpired ? "outline" : "secondary"}
                        className={
                          isExpired
                            ? "text-muted-foreground"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7"
                        disabled={isExpired}
                        onClick={() => expireToken(token)}
                      >
                        Expire now
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: GitProvider }) {
  return (
    <span className="bg-muted flex size-6 items-center justify-center rounded-md border">
      {provider === "github" ? (
        <Github className="size-3.5" />
      ) : (
        <span className="text-[10px] font-bold" aria-hidden="true">
          F
        </span>
      )}
    </span>
  );
}

function providerName(provider: GitProvider) {
  return provider === "github" ? "GitHub" : "Forgejo";
}
