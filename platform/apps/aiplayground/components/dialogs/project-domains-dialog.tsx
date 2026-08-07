"use client";

import {
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@/hooks/use-project";
import { useSessionsStore } from "@/store/playground-store";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { ExternalLink, Globe, LoaderCircle, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ProjectDomainsDialog({
  projectId,
  projectSessionId,
}: {
  projectId: string;
  projectSessionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const instanceId = useSessionsStore((state) =>
    projectSessionId
      ? state.sessions.find((entry) => entry.session.id === projectSessionId)
          ?.instance?.id
      : undefined,
  );
  const { data, isPending, isError } = useGetProjectDomainsById(
    projectId,
    open || !!instanceId,
  );
  const assignDomains = useUpdateProjectRoutingTargetInstance();
  const needsAssignment =
    !!instanceId &&
    !isPending &&
    !isError &&
    data?.target_instance_id !== instanceId;
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

  const handleDomainAction = async () => {
    if (!needsAssignment || !instanceId) {
      setOpen(true);
      return;
    }

    try {
      await assignDomains.mutateAsync({ id: projectId, instanceId });
      toast.success("Project domains assigned to this session");
    } catch {
      toast.error("Failed to assign project domains");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={
          needsAssignment
            ? "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white"
            : "bg-background/90 shadow-sm backdrop-blur"
        }
        disabled={assignDomains.isPending}
        onClick={handleDomainAction}
      >
        {assignDomains.isPending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Globe />
        )}
        {needsAssignment ? "Assign domains" : "Domains"}
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
