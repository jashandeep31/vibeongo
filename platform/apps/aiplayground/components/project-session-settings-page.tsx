"use client";

import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { UpdateInstanceTimeDialog } from "@/components/dialogs/update-instance-time-dialog";
import { RuntimeToolCard } from "@/components/runtime-tool-card";
import { useRuntimeControlSocket } from "@/hooks/use-runtime-control-socket";
import {
  useGetInstances,
  useGetProjectDomainsById,
  useRestartDevScript,
  useRuntimeStats,
} from "@repo/api-hooks";
import { getOpencodePassword } from "@repo/api-client";
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
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Cpu,
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
}: {
  projectId: string;
  projectSessionId: string;
  sessionId: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<"ip" | "ssh" | null>(null);
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
    !storedInstance,
  );
  const instance = storedInstance ?? instancesQuery.data?.data[0];
  const localToken = getConfigValue(instance?.config, "vibeongoLocalToken");
  const connection = {
    instanceId: instance?.id ?? "",
    runtimeUrl: instance
      ? `https://3101-${instance.id}${instance.proxy_domain}`
      : "",
    localToken,
    accessToken: instance?.access_token ?? "",
  };
  const runtimeStats = useRuntimeStats(connection, true);
  const restartDevScript = useRestartDevScript(connection);
  const domainsQuery = useGetProjectDomainsById(projectId, Boolean(instance));
  const domainsPointToRuntime =
    domainsQuery.data?.target_instance_id === instance?.id;
  const controlDomain = domainsPointToRuntime
    ? domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 3101,
      )?.domain
    : undefined;
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
  const runtimeSocket = useRuntimeControlSocket({
    enabled: Boolean(controlDomain && localToken),
    localToken,
    runtimeUrl: controlDomain ? `https://${controlDomain}` : "",
  });

  useEffect(() => {
    if (!instance) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [instance]);

  const chatUrl = `/projects/${projectId}/chats/${projectSessionId}/sessions/${sessionId}`;
  const terminalUrl = `/projects/${projectId}/chats/${projectSessionId}/terminal`;
  const cpuPercent = normalizePercent(runtimeStats.data?.cpu_percent);
  const memoryPercent = normalizePercent(runtimeStats.data?.used_percent);
  const terminatesAt = instance
    ? new Date(instance.terminates_at).getTime()
    : Number.NaN;
  const startedAt = instance
    ? new Date(instance.started_at).getTime()
    : Number.NaN;
  const sshCommand = instance?.public_ip
    ? `ssh ubuntu@${instance.public_ip}`
    : "";

  const copyValue = async (kind: "ip" | "ssh", value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "ip" ? "IP address copied" : "SSH command copied");
      window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (!instance && instancesQuery.isPending) {
    return <SettingsSkeleton />;
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
          <Button asChild>
            <Link href={chatUrl}>
              <ArrowLeft /> Back to chat
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 md:px-8 md:py-10">
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
                {projectName} · Manage this session&apos;s running environment.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <section className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={<Cpu className="size-4" />}
            label="CPU"
            value={cpuPercent}
            loading={runtimeStats.isPending}
          />
          <MetricCard
            icon={<HardDrive className="size-4" />}
            label="Memory"
            value={memoryPercent}
            loading={runtimeStats.isPending}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <RuntimeToolCard
            disabled={!opencodeDomain}
            isConnected={runtimeSocket.status === "connected"}
            lastMessage={runtimeSocket.toolMessages.opencode ?? null}
            opencodePassword={getOpencodePassword(instance.config)}
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

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="text-muted-foreground size-4" />
                Runtime
              </CardTitle>
              <CardDescription>Timing for the active instance.</CardDescription>
              <CardAction>
                {instance.runtime_kind === "sandbox" ? (
                  <Button size="sm" variant="outline" disabled>
                    Update expiration
                  </Button>
                ) : (
                  <UpdateInstanceTimeDialog
                    instanceId={instance.id}
                    projectSessionId={projectSessionId}
                  >
                    <Button size="sm" variant="outline">
                      Update expiration
                    </Button>
                  </UpdateInstanceTimeDialog>
                )}
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
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
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <CopyRow
              label="Public IP"
              value={instance.public_ip ?? "Unavailable"}
              copied={copied === "ip"}
              disabled={!instance.public_ip}
              onCopy={() => void copyValue("ip", instance.public_ip ?? "")}
            />
            <CopyRow
              label="SSH command"
              value={sshCommand || "Unavailable"}
              copied={copied === "ssh"}
              disabled={!sshCommand}
              onCopy={() => void copyValue("ssh", sshCommand)}
            />
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

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-10 md:px-8">
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
