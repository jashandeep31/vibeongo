"use client";

import {
  useAddAllowedIpToProject,
  useDeleteMultipleAllowedIpsFromProject,
  useGetProjectDomainsById,
  useUpdateProjectDomainAccess,
  useUpdateProjectDomainPort,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import { useCurrentUserIp } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Switch } from "@repo/ui/components/switch";
import {
  ExternalLink,
  Globe,
  Lock,
  LoaderCircle,
  Network,
  Pencil,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";

export function ProjectDomainsDialog({
  projectId,
  projectSessionId,
}: {
  projectId: string;
  projectSessionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [updatingDomainId, setUpdatingDomainId] = useState<string | null>(null);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [portInput, setPortInput] = useState("");
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
  const addAllowedIp = useAddAllowedIpToProject();
  const deleteOtherAllowedIps = useDeleteMultipleAllowedIpsFromProject();
  const updateDomainAccess = useUpdateProjectDomainAccess();
  const updateDomainPort = useUpdateProjectDomainPort();
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
  const currentIpDomain = data?.proxy_domains.find(
    (domain) => domain.target_port === 3101,
  )?.domain;
  const { data: currentUserIp, isLoading: isCurrentIpLoading } =
    useCurrentUserIp(currentIpDomain);
  const currentIp = currentUserIp?.trim() ?? "";
  const isCurrentIpAllowed =
    !!currentIp &&
    allowedIps.some((allowedIp) => allowedIp.ip.trim() === currentIp);
  const otherAllowedIps = useMemo(
    () =>
      currentIp
        ? allowedIps.filter((allowedIp) => allowedIp.ip.trim() !== currentIp)
        : [],
    [allowedIps, currentIp],
  );
  const showIpWarning =
    !needsAssignment &&
    !isCurrentIpLoading &&
    !!currentIp &&
    !isCurrentIpAllowed;

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

  const handleAddAllowedIp = async (ip: string) => {
    const normalizedIp = ip.trim();

    if (!normalizedIp) {
      toast.error("Please enter an IP address");
      return;
    }

    const toastId = toast.loading(
      normalizedIp === currentIp
        ? "Adding current IP..."
        : "Adding allowed IP...",
    );

    try {
      await addAllowedIp.mutateAsync({ id: projectId, ip: normalizedIp });
      setNewIp("");
      toast.success(
        normalizedIp === currentIp ? "Current IP added" : "Allowed IP added",
        { id: toastId },
      );
    } catch {
      toast.error(
        normalizedIp === currentIp
          ? "Failed to add current IP"
          : "Failed to add allowed IP",
        { id: toastId },
      );
    }
  };

  const handleAddCustomIp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleAddAllowedIp(newIp);
  };

  const handleDeleteOtherAllowedIps = async () => {
    if (!otherAllowedIps.length) {
      toast.info("No other allowed IPs to remove");
      return;
    }

    const toastId = toast.loading("Removing other allowed IPs...");

    try {
      await deleteOtherAllowedIps.mutateAsync({
        id: projectId,
        ids: otherAllowedIps.map((allowedIp) => allowedIp.id),
      });
      toast.success("Other allowed IPs removed", { id: toastId });
    } catch {
      toast.error("Failed to remove other allowed IPs", { id: toastId });
    }
  };

  const handleAllowAllIps = async (domainId: string, allowAllIps: boolean) => {
    const toastId = toast.loading("Updating domain access...");
    setUpdatingDomainId(domainId);

    try {
      await updateDomainAccess.mutateAsync({
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

  const startEditingPort = (domainId: string, targetPort: number) => {
    setEditingDomainId(domainId);
    setPortInput(String(targetPort));
  };

  const stopEditingPort = () => {
    setEditingDomainId(null);
    setPortInput("");
  };

  const handleUpdatePort = async (
    domainId: string,
    currentPort: number,
    isEditable: boolean,
  ) => {
    if (!isEditable) {
      toast.error("This domain port is managed by the platform");
      return;
    }

    const parsedPort = Number(portInput.trim());
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      toast.error("Please enter a valid port between 1 and 65535");
      return;
    }

    if (parsedPort === currentPort) {
      stopEditingPort();
      return;
    }

    const toastId = toast.loading("Updating domain port...");
    setUpdatingDomainId(domainId);

    try {
      await updateDomainPort.mutateAsync({
        id: projectId,
        domainId,
        target_port: parsedPort,
      });
      stopEditingPort();
      toast.success(`Domain now routes to port ${parsedPort}`, { id: toastId });
    } catch {
      toast.error("Failed to update domain port", { id: toastId });
    } finally {
      setUpdatingDomainId(null);
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
            : showIpWarning
              ? "border-amber-500/50 bg-amber-500/10 text-amber-700 shadow-sm hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              : "bg-background/90 shadow-sm backdrop-blur"
        }
        disabled={assignDomains.isPending}
        onClick={handleDomainAction}
      >
        {assignDomains.isPending ? (
          <LoaderCircle className="animate-spin" />
        ) : showIpWarning ? (
          <TriangleAlert />
        ) : (
          <Globe />
        )}
        {needsAssignment
          ? "Assign domains"
          : showIpWarning
            ? "IP not allowed"
            : "Domains"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) stopEditingPort();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project domains</DialogTitle>
            <DialogDescription>
              Open routed services, edit custom target ports, or manage the IPs
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
              {!isCurrentIpLoading && currentIp && !isCurrentIpAllowed ? (
                <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                  <TriangleAlert />
                  <AlertTitle>Allow this device to connect</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Your current IP,{" "}
                      <span className="font-mono font-medium">{currentIp}</span>
                      , is not in this project&apos;s allowlist.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="w-fit shrink-0"
                      disabled={addAllowedIp.isPending}
                      onClick={() => void handleAddAllowedIp(currentIp)}
                    >
                      {addAllowedIp.isPending ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Plus />
                      )}
                      {addAllowedIp.isPending ? "Allowing..." : "Allow this IP"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

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
                      <div
                        key={domain.id}
                        className="hover:border-primary hover:bg-muted/50 flex min-w-0 flex-col items-stretch gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center"
                      >
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <span className="bg-muted rounded-md p-2">
                            <Globe className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {domain.domain}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {domain.is_editable
                                ? "Custom service route"
                                : "Platform-managed route"}
                            </span>
                          </span>
                          <ExternalLink className="text-muted-foreground size-4 shrink-0" />
                        </a>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                          {editingDomainId === domain.id ? (
                            <form
                              className="flex items-center gap-1"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void handleUpdatePort(
                                  domain.id,
                                  domain.target_port,
                                  domain.is_editable,
                                );
                              }}
                            >
                              <Input
                                type="number"
                                min={1}
                                max={65535}
                                inputMode="numeric"
                                aria-label={`Target port for ${domain.domain}`}
                                className="h-8 w-24 font-mono text-xs"
                                value={portInput}
                                autoFocus
                                disabled={updatingDomainId === domain.id}
                                onChange={(event) =>
                                  setPortInput(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    stopEditingPort();
                                  }
                                }}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                disabled={updatingDomainId === domain.id}
                              >
                                {updatingDomainId === domain.id ? (
                                  <LoaderCircle className="animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Cancel port editing"
                                disabled={updatingDomainId === domain.id}
                                onClick={stopEditingPort}
                              >
                                <X />
                              </Button>
                            </form>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="font-mono"
                              title={
                                domain.is_editable
                                  ? "Edit target port"
                                  : "This port is managed by the platform"
                              }
                              disabled={
                                !domain.is_editable ||
                                updatingDomainId === domain.id
                              }
                              onClick={() =>
                                startEditingPort(domain.id, domain.target_port)
                              }
                            >
                              {domain.is_editable ? <Pencil /> : <Lock />}
                              Port {domain.target_port}
                            </Button>
                          )}
                          <span className="flex items-center gap-2 text-xs">
                            All IPs
                            <Switch
                              size="sm"
                              aria-label={`Allow all IPs for ${domain.domain}`}
                              checked={domain.allow_all_ips}
                              disabled={updatingDomainId === domain.id}
                              onCheckedChange={(checked) =>
                                void handleAllowAllIps(domain.id, checked)
                              }
                            />
                          </span>
                        </div>
                      </div>
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

                <p className="text-muted-foreground text-sm">
                  Your current IP:{" "}
                  <span className="text-foreground font-mono">
                    {isCurrentIpLoading
                      ? "Loading..."
                      : currentIp || "Unavailable"}
                  </span>
                </p>

                <form onSubmit={handleAddCustomIp} className="flex gap-2">
                  <Input
                    name="ip"
                    placeholder="Enter IP address (e.g. 203.0.113.10)"
                    autoComplete="off"
                    value={newIp}
                    onChange={(event) => setNewIp(event.target.value)}
                    disabled={addAllowedIp.isPending}
                  />
                  <Button type="submit" disabled={addAllowedIp.isPending}>
                    {addAllowedIp.isPending ? "Adding..." : "Add IP"}
                  </Button>
                </form>

                {allowedIps.length ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                    {allowedIps.map((allowedIp) => (
                      <Badge
                        key={allowedIp.id}
                        variant="secondary"
                        className="font-mono font-normal"
                      >
                        {allowedIp.ip}
                      </Badge>
                    ))}
                    {isCurrentIpAllowed && otherAllowedIps.length ? (
                      <ConfirmationDialog
                        title="Remove other allowed IPs"
                        description={`Remove ${otherAllowedIps.length} allowed IP${otherAllowedIps.length === 1 ? "" : "s"} and keep ${currentIp}?`}
                        confirmText="Remove others"
                        isDestructive
                        onConfirm={() => void handleDeleteOtherAllowedIps()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deleteOtherAllowedIps.isPending}
                        >
                          {deleteOtherAllowedIps.isPending
                            ? "Removing..."
                            : "Remove others"}
                        </Button>
                      </ConfirmationDialog>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                    No IP addresses have been added.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Allowed IP or domain access changes can take up to 30 seconds
                  to take effect.
                </p>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
