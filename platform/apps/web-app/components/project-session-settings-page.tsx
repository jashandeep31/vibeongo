"use client";

import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { useRuntimeSession } from "@/components/runtime-session-provider";
import { UpdateInstanceTimeDialog } from "@/components/dialogs/update-instance-time-dialog";
import { RuntimeToolCard } from "@/components/runtime-tool-card";
import {
  useCreateSshAccess,
  useRevokeSshAccess,
  useSshAccess,
  useGetInstances,
  useGetProjectDomainsById,
  useRestartDevScript,
  useRenewOpencodeCredentials,
  useGetProjectWithDetails,
} from "@repo/api-hooks";
import { supportsInstanceTimeExtension } from "@repo/shared/providers";
import {
  formatSshCommand,
  getOpencodePassword,
  type CreateSshAccessResponse,
} from "@repo/api-client";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Cpu,
  FolderOpen,
  HardDrive,
  Network,
  RefreshCw,
  Rocket,
  Terminal,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function getConfigValue(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function normalizePercent(value: unknown) {
  const percent = typeof value === "number" ? value : Number(value);
  return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

function formatDate(value: unknown) {
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : dateFormatter.format(date);
}

function formatDuration(milliseconds: number) {
  if (!Number.isFinite(milliseconds)) return "Unavailable";
  if (milliseconds <= 0) return "Expired";

  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function ProjectSessionSettingsPage({
  projectId,
  projectSessionId,
  sessionId,
  mode = "page",
  isActive = true,
  onOpenFiles,
  onOpenTerminal,
  onOpenDomains,
  onClose,
}: {
  projectId: string;
  projectSessionId: string;
  sessionId?: string;
  mode?: "page" | "panel";
  isActive?: boolean;
  onOpenFiles?: () => void;
  onOpenTerminal?: () => void;
  onOpenDomains?: () => void;
  onClose?: () => void;
}) {
  const isPanel = mode === "panel";
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<"gateway" | null>(null);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const instancesQuery = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    isActive && !storedInstance,
  );
  const instance = storedInstance ?? instancesQuery.data?.data[0];
  const projectDetails = useGetProjectWithDetails(
    isActive && instance?.runtime_kind === "sandbox" ? projectId : null,
  );
  const canUpdateTime = supportsInstanceTimeExtension(
    instance,
    projectDetails.data?.deployment.sandbox,
  );
  const instanceId = instance?.id ?? "";
  const localToken = getConfigValue(instance?.config, "vibeongoLocalToken");
  const connection = {
    instanceId,
    runtimeUrl: instance
      ? `https://3101-${instance.id}${instance.proxy_domain}`
      : "",
    localToken,
    accessToken: instance?.access_token ?? "",
  };
  const runtimeSocket = useRuntimeSession();
  const restartDevScript = useRestartDevScript(connection);
  const createSshAccess = useCreateSshAccess();
  const revokeSshAccess = useRevokeSshAccess();
  const sshAccessList = useSshAccess(instanceId, isActive);
  const [newSshAccess, setNewSshAccess] =
    useState<CreateSshAccessResponse | null>(null);
  const renewCredentials = useRenewOpencodeCredentials(connection);
  const domainsQuery = useGetProjectDomainsById(
    projectId,
    isActive && Boolean(instance),
  );
  const domainsPointToRuntime =
    domainsQuery.data?.target_instance_id === instance?.id;
  const opencodeDomain = domainsPointToRuntime
    ? domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 4096,
      )?.domain
    : undefined;
  const t3CodeDomain = domainsPointToRuntime
    ? domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 3773,
      )?.domain
    : undefined;
  useEffect(() => {
    if (!instance || !isActive) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [instance, isActive]);

  const projectChatUrl = `/projects/${projectId}/sessions/${projectSessionId}`;
  const chatUrl = sessionId
    ? `${projectChatUrl}/chats/${sessionId}`
    : projectChatUrl;
  const terminalUrl = `/projects/${projectId}/sessions/${projectSessionId}/terminal`;
  const cpuPercent = normalizePercent(runtimeSocket.stats?.cpu_percent);
  const memoryPercent = normalizePercent(runtimeSocket.stats?.used_percent);
  const terminatesAt = instance
    ? new Date(instance.terminates_at).getTime()
    : Number.NaN;
  const startedAt = instance
    ? new Date(instance.started_at).getTime()
    : Number.NaN;
  const gatewayCommand = newSshAccess ? formatSshCommand(newSshAccess) : "";
  const gatewayExpiresAt = newSshAccess
    ? new Date(newSshAccess.expiresAt).getTime()
    : Number.NaN;
  const gatewayCommandIsValid =
    Boolean(gatewayCommand) &&
    gatewayExpiresAt > now &&
    sshAccessList.data?.find((access) => access.id === newSshAccess?.id)
      ?.status !== "revoked";

  useEffect(() => {
    setNewSshAccess(null);
  }, [projectSessionId, instance?.id]);

  const copyValue = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied("gateway");
      toast.success("SSH command copied");
      window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      toast.error("Command created. Copy it from the field below.");
    }
  };

  if (!instance && instancesQuery.isPending) {
    return <SettingsSkeleton isPanel={isPanel} />;
  }

  if (!instance) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="bg-muted flex size-11 items-center justify-center rounded-full">
            <TriangleAlert className="text-destructive size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="font-medium">Runtime unavailable</h1>
            <p className="text-muted-foreground text-sm">
              Resume this project session before opening its runtime settings.
            </p>
          </div>
          {isPanel && onClose ? (
            <Button onClick={onClose}>
              <ArrowLeft /> Back to chat
            </Button>
          ) : (
            <Button asChild>
              <Link href={chatUrl}>
                <ArrowLeft /> Back to chat
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <main
        className={cn(
          "@container/settings mx-auto w-full",
          isPanel
            ? "space-y-4 px-3 py-3"
            : "max-w-5xl space-y-6 px-5 py-8 md:px-8 md:py-10",
        )}
      >
        {isPanel ? (
          <header className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="min-w-0 flex-1 truncate text-sm font-medium"
              title={projectName}
            >
              {projectName}
            </span>
            <Badge
              variant="secondary"
              className="gap-1.5 text-emerald-600 dark:text-emerald-400"
            >
              <span className="size-1.5 rounded-full bg-current" /> Live
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenFiles}
              aria-label="Open files panel"
              title="Files"
            >
              <FolderOpen />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenTerminal}
              aria-label="Open terminals panel"
              title="Terminals"
            >
              <Terminal />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open domains panel"
              title="Domains"
              onClick={onOpenDomains}
            >
              <Network />
            </Button>
          </header>
        ) : (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Button asChild variant="ghost" size="sm" className="-ml-3">
                <Link href={chatUrl}>
                  <ArrowLeft /> Back to chat
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Runtime settings
                  </h1>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 text-emerald-600 dark:text-emerald-400"
                  >
                    <span className="size-1.5 rounded-full bg-current" /> Live
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {projectName} · Manage this session&apos;s running
                  environment.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${chatUrl}/files`}>
                  <FolderOpen /> Files
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={terminalUrl}>
                  <Terminal /> Terminal
                </Link>
              </Button>
              <ProjectDomainsDialog
                projectId={projectId}
                projectSessionId={projectSessionId}
              />
            </div>
          </header>
        )}

        <section
          className={cn(
            "grid gap-4",
            isPanel ? "@sm/settings:grid-cols-2" : "sm:grid-cols-2",
          )}
        >
          <MetricCard
            icon={<Cpu className="size-4" />}
            label="CPU"
            value={cpuPercent}
            loading={!runtimeSocket.stats}
          />
          <MetricCard
            icon={<HardDrive className="size-4" />}
            label="Memory"
            value={memoryPercent}
            loading={!runtimeSocket.stats}
          />
        </section>

        <section className={cn("grid gap-4", !isPanel && "lg:grid-cols-2")}>
          <RuntimeToolCard
            disabled={!opencodeDomain}
            isConnected={runtimeSocket.status === "connected"}
            lastMessage={runtimeSocket.toolMessages.opencode ?? null}
            opencodePassword={getOpencodePassword(instance.config)}
            renewingCredentials={renewCredentials.isPending}
            onRenewCredentials={() => {
              renewCredentials.mutate(undefined, {
                onSuccess: () => toast.success("Credentials renewed"),
                onError: (error) =>
                  toast.error(error.message || "Could not renew credentials"),
              });
            }}
            sendJsonMessage={runtimeSocket.sendJsonMessage}
            tool="opencode"
            url={opencodeDomain ? `https://${opencodeDomain}` : ""}
          />
          <RuntimeToolCard
            disabled={!t3CodeDomain}
            isConnected={runtimeSocket.status === "connected"}
            lastMessage={runtimeSocket.toolMessages.codex ?? null}
            sendJsonMessage={runtimeSocket.sendJsonMessage}
            tool="codex"
            url={t3CodeDomain ? `https://${t3CodeDomain}` : ""}
          />
        </section>

        <section className={cn("grid gap-4", !isPanel && "lg:grid-cols-2")}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="text-muted-foreground size-4" />
                Runtime
              </CardTitle>
              <CardDescription>Timing for the active instance.</CardDescription>
              <CardAction>
                {!canUpdateTime ? (
                  <Button size="sm" variant="outline" disabled>
                    Update expiration
                  </Button>
                ) : (
                  <UpdateInstanceTimeDialog
                    instanceId={instance.id}
                    projectSessionId={projectSessionId}
                    isBoatSandbox={instance.runtime_kind === "sandbox"}
                  >
                    <Button size="sm" variant="outline">
                      Update expiration
                    </Button>
                  </UpdateInstanceTimeDialog>
                )}
              </CardAction>
            </CardHeader>
            <CardContent
              className={cn(
                "grid gap-4",
                isPanel ? "@lg/settings:grid-cols-3" : "sm:grid-cols-3",
              )}
            >
              <RuntimeDetail
                icon={<TimerReset />}
                label="Terminates in"
                value={formatDuration(terminatesAt - now)}
                mono
              />
              <RuntimeDetail
                icon={<Rocket />}
                label="Started"
                value={formatDate(instance.started_at)}
              />
              <RuntimeDetail
                icon={<CalendarClock />}
                label="Uptime"
                value={formatDuration(now - startedAt)}
                mono
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dev script</CardTitle>
              <CardDescription>
                Restart the development processes for this instance.
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!localToken || restartDevScript.isPending}
                  onClick={() =>
                    restartDevScript.mutate(undefined, {
                      onSuccess: () => toast.success("Dev script restarted"),
                      onError: () =>
                        toast.error("Failed to restart dev script"),
                    })
                  }
                >
                  <RefreshCw
                    className={
                      restartDevScript.isPending ? "animate-spin" : undefined
                    }
                  />
                  {restartDevScript.isPending ? "Restarting…" : "Restart"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {!localToken ? (
                <p className="text-muted-foreground text-sm">
                  Runtime credentials are unavailable, so the dev script cannot
                  be restarted.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Use this after changing runtime configuration or when the
                  development server stops responding.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="text-muted-foreground size-4" /> Connection
            </CardTitle>
            <CardDescription>
              Direct access details for this runtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">SSH gateway</p>
                  <p className="text-muted-foreground text-xs">
                    Create access valid for 60 minutes. Copy the command when it
                    appears; it cannot be shown again.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!instance || createSshAccess.isPending}
                  onClick={() =>
                    instance &&
                    createSshAccess.mutate(instanceId, {
                      onSuccess: (connection) => {
                        setNewSshAccess(connection);
                        void copyValue(formatSshCommand(connection));
                      },
                      onError: () =>
                        toast.error("Could not create SSH command. Try again."),
                    })
                  }
                >
                  <Terminal />
                  {createSshAccess.isPending
                    ? "Creating…"
                    : "Create SSH access"}
                </Button>
              </div>
              {gatewayCommandIsValid ? (
                <div aria-live="polite" className="space-y-1.5">
                  <CopyRow
                    label="Gateway SSH command"
                    value={gatewayCommand}
                    copied={copied === "gateway"}
                    disabled={false}
                    onCopy={() => void copyValue(gatewayCommand)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Expires in {formatDuration(gatewayExpiresAt - now)}. Save
                    this command now; it cannot be retrieved later.
                  </p>
                </div>
              ) : newSshAccess ? (
                <p className="text-muted-foreground text-xs" role="status">
                  SSH command expired or was revoked. Create a new one to
                  connect.
                </p>
              ) : null}
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Created SSH access</p>
                {!instanceId ? (
                  <p className="text-muted-foreground text-xs">
                    No instance is available for SSH access.
                  </p>
                ) : sshAccessList.isPending ? (
                  <p className="text-muted-foreground text-xs">
                    Loading access…
                  </p>
                ) : sshAccessList.isError ? (
                  <p className="text-destructive text-xs">
                    Could not load SSH access.
                  </p>
                ) : sshAccessList.data?.length ? (
                  sshAccessList.data.map((access) => {
                    const status = access.revokedAt
                      ? "Revoked"
                      : new Date(access.expiresAt).getTime() <= now
                        ? "Expired"
                        : access.status === "instance_unavailable"
                          ? "Instance unavailable"
                          : "Active";
                    return (
                      <div
                        key={access.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-xs"
                      >
                        <div className="space-y-1">
                          <p>
                            Created {formatDate(access.createdAt)} · {status}
                          </p>
                          <p className="text-muted-foreground">
                            Expires {formatDate(access.expiresAt)}
                            {access.lastUsedAt
                              ? ` · Last used ${formatDate(access.lastUsedAt)}`
                              : ""}
                          </p>
                        </div>
                        {!access.revokedAt &&
                        new Date(access.expiresAt).getTime() > now ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={revokeSshAccess.isPending}
                            onClick={() =>
                              revokeSshAccess.mutate(
                                { instanceId, accessId: access.id },
                                {
                                  onSuccess: () => {
                                    if (newSshAccess?.id === access.id)
                                      setNewSshAccess(null);
                                    toast.success("SSH access revoked");
                                  },
                                  onError: () =>
                                    toast.error("Could not revoke SSH access"),
                                },
                              )
                            }
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-xs">
                    No SSH access created yet.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2">
            {icon} {label}
          </span>
          <span className="font-mono font-medium tabular-nums">
            {loading || value === null ? "--%" : `${value.toFixed(0)}%`}
          </span>
        </div>
        <Progress value={value ?? 0} className="h-2" />
      </CardContent>
    </Card>
  );
}

function RuntimeDetail({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs [&_svg]:size-3.5">
        {icon} {label}
      </div>
      <p
        className={`mt-1.5 text-sm font-medium ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copied,
  disabled,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-muted/40 flex min-w-0 items-center gap-3 rounded-lg p-3">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-mono text-sm" title={value}>
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={onCopy}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

function SettingsSkeleton({ isPanel = false }: { isPanel?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto min-h-0 w-full flex-1 space-y-6 overflow-y-auto",
        isPanel ? "px-3 py-3" : "max-w-5xl px-5 py-10 md:px-8",
      )}
    >
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}
