"use client";

import { FormEvent, useState } from "react";
import { Globe, ExternalLink, X, Lock, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  useAddAllowedIpToProject,
  useDeleteAllowedIpFromProject,
  useGetProjectDomainsById,
  useUpdateProjectDomainPort,
} from "@/hooks/use-project";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { useCurrentUserIp } from "@/hooks/use-ip";

interface ProjectDomainsCardProps {
  projectId: string;
}

export function ProjectDomainsCard({ projectId }: ProjectDomainsCardProps) {
  const [newIp, setNewIp] = useState("");
  const [deletingIpId, setDeletingIpId] = useState<string | null>(null);
  const [updatingDomainId, setUpdatingDomainId] = useState<string | null>(null);
  const [portInputs, setPortInputs] = useState<Record<string, string>>({});
  const { data, isLoading } = useGetProjectDomainsById(projectId);
  const addAllowedIpMutation = useAddAllowedIpToProject();
  const deleteAllowedIpMutation = useDeleteAllowedIpFromProject();
  const updateDomainPortMutation = useUpdateProjectDomainPort();
  const { data: currentUserIp, isLoading: isCurrentUserIpLoading } =
    useCurrentUserIp();
  const proxyDomains = data?.proxy_domains ?? [];
  const allowedIps = data?.allowed_ips ?? [];
  const currentIp = currentUserIp?.trim() ?? "";
  const isCurrentIpAllowed =
    !!currentIp &&
    allowedIps.some((allowedIp) => allowedIp.ip.trim() === currentIp);

  const handleAddIp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ip = newIp.trim();

    if (!ip) {
      toast.error("Please enter an IP address");
      return;
    }

    const toastId = toast.loading("Adding allowed IP...");
    try {
      await addAllowedIpMutation.mutateAsync({ id: projectId, ip });
      setNewIp("");
      toast.success("Allowed IP added", { id: toastId });
    } catch {
      toast.error("Failed to add allowed IP", { id: toastId });
    }
  };

  const handleDeleteIp = async (ipId: string) => {
    const toastId = toast.loading("Removing allowed IP...");
    setDeletingIpId(ipId);

    try {
      await deleteAllowedIpMutation.mutateAsync({ id: projectId, ipId });
      toast.success("Allowed IP removed", { id: toastId });
    } catch {
      toast.error("Failed to remove allowed IP", { id: toastId });
    } finally {
      setDeletingIpId(null);
    }
  };

  const handleAddCurrentIp = async () => {
    if (!currentIp) {
      toast.error("Current IP address is not available");
      return;
    }

    if (isCurrentIpAllowed) {
      toast.info("Current IP is already allowed");
      return;
    }

    const toastId = toast.loading("Adding current IP...");
    try {
      await addAllowedIpMutation.mutateAsync({ id: projectId, ip: currentIp });
      toast.success("Current IP added", { id: toastId });
    } catch {
      toast.error("Failed to add current IP", { id: toastId });
    }
  };

  const handleUpdatePort = async (domainId: string, fallbackPort: number) => {
    const inputValue = (portInputs[domainId] ?? String(fallbackPort)).trim();
    const parsedPort = Number(inputValue);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      toast.error("Please enter a valid port between 1 and 65535");
      return;
    }

    const toastId = toast.loading("Updating domain port...");
    setUpdatingDomainId(domainId);

    try {
      await updateDomainPortMutation.mutateAsync({
        id: projectId,
        domainId,
        target_port: parsedPort,
      });
      setPortInputs((prev) => {
        const next = { ...prev };
        delete next[domainId];
        return next;
      });
      toast.success("Domain port updated", { id: toastId });
    } catch {
      toast.error("Failed to update domain port", { id: toastId });
    } finally {
      setUpdatingDomainId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Globe className="text-muted-foreground h-5 w-5" />
        Domains
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Project Domains</CardTitle>
          <CardDescription>
            {data?.target_instance_id ? (
              <span>
                project is targeted to{" "}
                <Link
                  className="text-blue-500 hover:underline"
                  href={`/projects/${projectId}/instances/${data.target_instance_id}`}
                >
                  Instance
                </Link>
              </span>
            ) : (
              "project is not targeted to any instance"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">
              Loading domains...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                {proxyDomains.length > 0 ? (
                  proxyDomains
                    .sort((t) => (t.is_editable ? 1 : -1))
                    .map((domainRow) => (
                      <div
                        key={domainRow.id}
                        className="flex flex-col gap-3 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <a
                          href={`https://${domainRow.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          title={domainRow.domain}
                          className="flex min-w-0 items-start gap-2 text-sm text-blue-500 hover:underline sm:items-center"
                        >
                          <Globe className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 break-all sm:truncate">
                            {domainRow.domain}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                          <Input
                            type="number"
                            min={1}
                            max={65535}
                            className="h-8 w-24 font-mono text-xs"
                            value={
                              portInputs[domainRow.id] ??
                              String(domainRow.target_port)
                            }
                            onChange={(event) =>
                              setPortInputs((prev) => ({
                                ...prev,
                                [domainRow.id]: event.target.value,
                              }))
                            }
                            disabled={
                              updatingDomainId === domainRow.id ||
                              !domainRow.is_editable
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              updatingDomainId === domainRow.id ||
                              !domainRow.is_editable
                            }
                            onClick={() => {
                              void handleUpdatePort(
                                domainRow.id,
                                domainRow.target_port,
                              );
                            }}
                          >
                            {!domainRow.is_editable ? (
                              <Lock className="h-4 w-4" />
                            ) : updatingDomainId === domainRow.id ? (
                              "Saving..."
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No domains are configured for this project.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Allowed IPs</h3>
                  <span className="bg-muted text-muted-foreground rounded border px-2 py-0.5 text-xs">
                    {allowedIps.length}
                  </span>
                </div>

                <div className="text-muted-foreground text-sm">
                  Your current IP:{" "}
                  <span className="text-foreground font-mono">
                    {isCurrentUserIpLoading
                      ? "Loading..."
                      : currentIp || "Unavailable"}
                  </span>
                </div>

                <form onSubmit={handleAddIp}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      name="ip"
                      placeholder="Enter IP address (e.g. 203.0.113.10)"
                      autoComplete="off"
                      value={newIp}
                      onChange={(event) => setNewIp(event.target.value)}
                      disabled={addAllowedIpMutation.isPending}
                    />
                    <Button
                      type="submit"
                      className="sm:w-auto"
                      disabled={addAllowedIpMutation.isPending}
                    >
                      {addAllowedIpMutation.isPending ? "Adding..." : "Add IP"}
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2">
                  {currentIp && !isCurrentIpAllowed ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleAddCurrentIp();
                      }}
                      disabled={addAllowedIpMutation.isPending}
                      className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-700 transition-colors hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{currentIp}</span>
                    </button>
                  ) : null}

                  {allowedIps.length > 0 ? (
                    allowedIps.map((allowedIp) => (
                      <div
                        key={allowedIp.id}
                        className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs"
                      >
                        <span>{allowedIp.ip}</span>
                        <ConfirmationDialog
                          title="Remove allowed IP"
                          description={`Are you sure you want to remove ${allowedIp.ip} from the allowlist?`}
                          confirmText="Remove"
                          isDestructive
                          onConfirm={() => {
                            void handleDeleteIp(allowedIp.id);
                          }}
                        >
                          <button
                            type="button"
                            className="hover:bg-background/80 rounded p-0.5"
                            aria-label={`Remove ${allowedIp.ip}`}
                            disabled={deletingIpId === allowedIp.id}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </ConfirmationDialog>
                      </div>
                    ))
                  ) : !currentIp || isCurrentIpAllowed ? (
                    <div className="text-muted-foreground text-sm">
                      No allowed IPs configured.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          <p className="text-muted-foreground mt-4 text-sm">
            Allowed IPs or Domain changes can take upto{" "}
            <span className="text-foreground font-bold">30Secs</span> to take
            effect
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
