"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { ChevronLeft, ChevronRight, Github } from "lucide-react";
import {
  useGitRepoAccessTokens,
  useRevokeGitRepoAccessToken,
} from "@repo/api-hooks";
import { useState } from "react";
import { toast } from "sonner";

type GitProvider = "github" | "forgejo";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const PAGE_LIMIT = 10;

export default function AccessTokensPage() {
  const [page, setPage] = useState(1);
  const tokensQuery = useGitRepoAccessTokens({ page, limit: PAGE_LIMIT });
  const revokeTokenMutation = useRevokeGitRepoAccessToken();
  const tokens = tokensQuery.data?.data ?? [];
  const currentPage = tokensQuery.data?.page ?? page;

  const revokeToken = (id: string) => {
    revokeTokenMutation.mutate(id, {
      onSuccess: ({ message }) => toast.success(message),
      onError: () => toast.error("Failed to revoke Git access token."),
    });
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
              {tokensQuery.isLoading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }, (_, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tokensQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Failed to load access tokens.
                  </TableCell>
                </TableRow>
              ) : tokens.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No Git access tokens found.
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => {
                  const isExpired =
                    token.revoked_at !== null ||
                    new Date(token.expires_at).getTime() <= Date.now();

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
                          {token.provider_token_id ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground font-mono text-xs">
                          {token.instance_id ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {dateFormatter.format(new Date(token.created_at))}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {dateFormatter.format(new Date(token.expires_at))}
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
                          disabled={
                            token.revoked_at !== null ||
                            (revokeTokenMutation.isPending &&
                              revokeTokenMutation.variables === token.id)
                          }
                          onClick={() => revokeToken(token.id)}
                        >
                          {revokeTokenMutation.isPending &&
                          revokeTokenMutation.variables === token.id
                            ? "Revoking…"
                            : token.revoked_at
                              ? "Revoked"
                              : "Revoke"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={tokensQuery.isFetching || currentPage <= 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-muted-foreground min-w-16 text-center text-sm">
            Page {currentPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={tokensQuery.isFetching || !tokensQuery.data?.hasNext}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
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
