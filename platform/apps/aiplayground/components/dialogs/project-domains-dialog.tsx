"use client";

import { useGetProjectDomainsById } from "@/hooks/use-project";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { ExternalLink, Globe, Network } from "lucide-react";
import { useMemo, useState } from "react";

export function ProjectDomainsDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isPending, isError } = useGetProjectDomainsById(
    projectId,
    open,
  );
  const domains = useMemo(
    () =>
      [...(data?.proxy_domains ?? [])].sort((left, right) => {
        const portOrder = left.target_port - right.target_port;
        return portOrder || left.domain.localeCompare(right.domain);
      }),
    [data?.proxy_domains],
  );
  const allowedIps = useMemo(
    () =>
      [...(data?.allowed_ips ?? [])].sort((left, right) =>
        left.ip.localeCompare(right.ip, undefined, { numeric: true }),
      ),
    [data?.allowed_ips],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-background/90 shadow-sm backdrop-blur"
        onClick={() => setOpen(true)}
      >
        <Globe />
        Domains
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project domains</DialogTitle>
            <DialogDescription>
              Open a routed service in a new tab or review the IPs currently
              allowed to access this project.
            </DialogDescription>
          </DialogHeader>

          {isPending ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Loading project domains...
            </p>
          ) : null}
          {isError ? (
            <p className="text-destructive py-8 text-center text-sm">
              Could not load project domains.
            </p>
          ) : null}

          {!isPending && !isError ? (
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="text-muted-foreground size-4" />
                    Available domains
                  </h3>
                  <Badge variant="outline">{domains.length}</Badge>
                </div>

                {domains.length ? (
                  <div className="grid gap-2">
                    {domains.map((domain) => (
                      <a
                        key={domain.id}
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:border-primary hover:bg-muted/50 flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <span className="bg-muted rounded-md p-2">
                          <Globe className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {domain.domain}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Port {domain.target_port} ·{" "}
                            {domain.allow_all_ips
                              ? "Public access"
                              : "Restricted access"}
                          </span>
                        </span>
                        <ExternalLink className="text-muted-foreground size-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    No domains are configured for this project.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Network className="text-muted-foreground size-4" />
                    Allowed IPs
                  </h3>
                  <Badge variant="outline">{allowedIps.length}</Badge>
                </div>

                {allowedIps.length ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                    {allowedIps.map((allowedIp) => (
                      <Badge
                        key={allowedIp.id}
                        variant="secondary"
                        className="font-mono font-normal"
                      >
                        {allowedIp.ip}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    No IP addresses have been added.
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
