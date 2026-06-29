"use client";

import { FormEvent, useMemo, useState } from "react";
import { Globe, ExternalLink, X, Lock, Plus, Copy, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Switch } from "@repo/ui/components/switch";
import {
  useDeleteAllowedIpFromProject,
  useGetProjectDomainsById,
  useUpdateProjectDomainPort,
} from "@/hooks/use-project";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";

interface ProjectDomainsCardProps {
  projectId: string;
  currentIp?: string;
  isCurrentIpLoading?: boolean;
  isCurrentIpAllowed?: boolean;
  isAddingAllowedIp?: boolean;
  isDeletingOtherAllowedIps?: boolean;
  onAddAllowedIp?: (ip: string) => Promise<void>;
  onDeleteOtherAllowedIps?: (ids: string[]) => Promise<void>;
}

export function ProjectDomainsCard({
  projectId,
  currentIp = "",
  isCurrentIpLoading = false,
  isCurrentIpAllowed = false,
  isAddingAllowedIp = false,
  isDeletingOtherAllowedIps = false,
  onAddAllowedIp,
  onDeleteOtherAllowedIps,
}: ProjectDomainsCardProps) {
  const [newIp, setNewIp] = useState("");
  const [deletingIpId, setDeletingIpId] = useState<string | null>(null);
  const [updatingDomainId, setUpdatingDomainId] = useState<string | null>(null);
  const [copiedDomainId, setCopiedDomainId] = useState<string | null>(null);
  const [portInputs, setPortInputs] = useState<Record<string, string>>({});
  const { data, isLoading } = useGetProjectDomainsById(projectId);
  const deleteAllowedIpMutation = useDeleteAllowedIpFromProject();
  const updateDomainPortMutation = useUpdateProjectDomainPort();
  const proxyDomains = useMemo(
    () =>
      [...(data?.proxy_domains ?? [])].sort((a, b) => {
        const editabilityOrder = Number(a.is_editable) - Number(b.is_editable);
        if (editabilityOrder !== 0) return editabilityOrder;

        const portOrder = a.target_port - b.target_port;
        if (portOrder !== 0) return portOrder;

        const domainOrder = a.domain.localeCompare(b.domain);
        if (domainOrder !== 0) return domainOrder;

        return a.id.localeCompare(b.id);
      }),
    [data?.proxy_domains],
  );
  const allowedIps = useMemo(
    () =>
      [...(data?.allowed_ips ?? [])].sort((a, b) => {
        const ipOrder = a.ip.localeCompare(b.ip, undefined, { numeric: true });
        if (ipOrder !== 0) return ipOrder;

        return a.id.localeCompare(b.id);
      }),
    [data?.allowed_ips],
  );
  const otherAllowedIps = useMemo(
    () =>
      currentIp
        ? allowedIps.filter((allowedIp) => allowedIp.ip.trim() !== currentIp)
        : [],
    [allowedIps, currentIp],
  );

  const handleAddIp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ip = newIp.trim();

    if (!ip) {
      toast.error("Please enter an IP address");
      return;
    }

    if (!onAddAllowedIp) {
      toast.error("Adding allowed IPs is not available here");
      return;
    }

    try {
      await onAddAllowedIp(ip);
      setNewIp("");
    } catch {
      // Toast handling lives with the owner of the add-IP mutation.
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

    if (!onAddAllowedIp) {
      toast.error("Adding allowed IPs is not available here");
      return;
    }

    try {
      await onAddAllowedIp(currentIp);
    } catch {
      // Toast handling lives with the owner of the add-IP mutation.
    }
  };

  const handleDeleteOtherIps = async () => {
    if (!currentIp) {
      toast.error("Current IP address is not available");
      return;
    }

    if (otherAllowedIps.length === 0) {
      toast.info("No other allowed IPs to remove");
      return;
    }

    if (!onDeleteOtherAllowedIps) {
      toast.error("Removing allowed IPs is not available here");
      return;
    }

    try {
      await onDeleteOtherAllowedIps(otherAllowedIps.map((ip) => ip.id));
    } catch {
      // Toast handling lives with the owner of the delete-IP mutation.
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

  const handleUpdateAllowAllIps = async (
    domainId: string,
    allowAllIps: boolean,
  ) => {
    const toastId = toast.loading("Updating domain access...");
    setUpdatingDomainId(domainId);

    try {
      await updateDomainPortMutation.mutateAsync({
        id: projectId,
        domainId,
        allow_all_ips: allowAllIps,
      });
      toast.success("Domain access updated", { id: toastId });
    } catch {
      toast.error("Failed to update domain access", { id: toastId });
    } finally {
      setUpdatingDomainId(null);
    }
  };

  const handleCopyDomain = async (domainId: string, domain: string) => {
    try {
      await navigator.clipboard.writeText(`https://${domain}`);
      setCopiedDomainId(domainId);
      toast.success("Domain copied");
      setTimeout(() => setCopiedDomainId(null), 1000);
    } catch {
      toast.error("Failed to copy domain");
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
                  proxyDomains.map((domainRow) => (
                    <div
                      key={domainRow.id}
                      className="flex flex-col gap-3 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-2 sm:items-center">
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
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          aria-label={`Copy ${domainRow.domain}`}
                          title="Copy domain"
                          onClick={() => {
                            void handleCopyDomain(
                              domainRow.id,
                              domainRow.domain,
                            );
                          }}
                        >
                          {copiedDomainId === domainRow.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span>All IPs</span>
                          <Switch
                            size="sm"
                            aria-label={`Allow all IPs for ${domainRow.domain}`}
                            checked={domainRow.allow_all_ips}
                            disabled={updatingDomainId === domainRow.id}
                            onCheckedChange={(checked) => {
                              void handleUpdateAllowAllIps(
                                domainRow.id,
                                checked,
                              );
                            }}
                          />
                        </div>
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
                    {isCurrentIpLoading
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
                      disabled={isAddingAllowedIp}
                    />
                    <Button
                      type="submit"
                      className="sm:w-auto"
                      disabled={isAddingAllowedIp || !onAddAllowedIp}
                    >
                      {isAddingAllowedIp ? "Adding..." : "Add IP"}
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
                      disabled={isAddingAllowedIp || !onAddAllowedIp}
                      className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-700 transition-colors hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{currentIp}</span>
                    </button>
                  ) : null}

                  {allowedIps.length > 0 ? (
                    <>
                      {allowedIps.map((allowedIp) => (
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
                      ))}

                      {otherAllowedIps.length > 0 ? (
                        <ConfirmationDialog
                          title="Remove other allowed IPs"
                          description={`Remove ${otherAllowedIps.length} allowed IP${otherAllowedIps.length === 1 ? "" : "s"} and keep ${currentIp}?`}
                          confirmText="Remove others"
                          isDestructive
                          onConfirm={() => {
                            void handleDeleteOtherIps();
                          }}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              isDeletingOtherAllowedIps ||
                              !onDeleteOtherAllowedIps
                            }
                          >
                            {isDeletingOtherAllowedIps
                              ? "Removing..."
                              : "Remove others"}
                          </Button>
                        </ConfirmationDialog>
                      ) : null}
                    </>
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
