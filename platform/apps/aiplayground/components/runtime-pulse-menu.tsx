"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { UpdateInstanceTimeDialog } from "@/components/dialogs/update-instance-time-dialog";
import {
  useDisableTerminateAfterDone,
  useRuntimeStats,
  useTerminateAfterDoneStatus,
} from "@/hooks/use-runtime-settings";
import { useSessionsStore } from "@/store/playground-store";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Progress } from "@repo/ui/components/progress";
import {
  Activity,
  CalendarClock,
  Check,
  Copy,
  Cpu,
  HardDrive,
  Loader2,
  Network,
  Rocket,
  Terminal,
  TimerOff,
  TimerReset,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function normalizePercent(value: unknown) {
  const percent = typeof value === "number" ? value : Number(value);
  return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
}

const runtimeDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

function formatRuntimeDate(value: unknown) {
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : runtimeDateFormatter.format(date);
}

function formatTimeRemaining(value: unknown, now: number) {
  const terminatesAt = new Date(value as string | number | Date).getTime();
  if (!Number.isFinite(terminatesAt)) return "Unavailable";

  const remainingMs = terminatesAt - now;
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${paddedSeconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${paddedSeconds}s`;
  }
  if (minutes > 0) return `${minutes}m ${paddedSeconds}s`;
  return `${seconds}s`;
}

export function RuntimePulseMenu({
  projectSessionId,
}: {
  projectSessionId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<"ip" | "ssh" | null>(null);
  const instance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const config =
    instance?.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config)
      ? instance.config
      : undefined;
  const localToken =
    config && "vibeongoLocalToken" in config
      ? config.vibeongoLocalToken
      : undefined;
  const connection = {
    instanceId: instance?.id ?? "",
    runtimeUrl: instance
      ? `https://3101-${instance.id}${instance.proxy_domain}`
      : "",
    localToken: typeof localToken === "string" ? localToken : "",
    accessToken: instance?.access_token ?? "",
  };
  const terminateStatus = useTerminateAfterDoneStatus(connection);
  const disableTerminate = useDisableTerminateAfterDone(connection);
  const runtimeStats = useRuntimeStats(connection, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  if (!instance || !connection.localToken || !connection.accessToken) {
    return null;
  }

  const terminateAfterDone = terminateStatus.data?.terminate;
  const cpuPercent = normalizePercent(runtimeStats.data?.cpu_percent);
  const memoryPercent = normalizePercent(runtimeStats.data?.used_percent);
  const sshCommand = instance.public_ip
    ? `ssh ubuntu@${instance.public_ip}`
    : null;

  const copyValue = async (kind: "ip" | "ssh", value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(kind);
      toast.success(kind === "ip" ? "IP address copied" : "SSH command copied");
      window.setTimeout(() => setCopiedValue(null), 1_500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <>
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setNow(Date.now());
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Activity />
            <span className="hidden sm:inline">Runtime controls</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
            <span>Runtime controls</span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-current" /> Live
            </span>
          </DropdownMenuLabel>

          <div className="grid grid-cols-2 gap-3 px-3 py-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Cpu className="size-3.5" /> CPU
                </span>
                <span className="font-medium tabular-nums">
                  {cpuPercent === null ? "--%" : `${cpuPercent.toFixed(0)}%`}
                </span>
              </div>
              <Progress value={cpuPercent ?? 0} className="mt-2 h-1.5" />
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="size-3.5" /> RAM
                </span>
                <span className="font-medium tabular-nums">
                  {memoryPercent === null
                    ? "--%"
                    : `${memoryPercent.toFixed(0)}%`}
                </span>
              </div>
              <Progress value={memoryPercent ?? 0} className="mt-2 h-1.5" />
            </div>
          </div>

          <div className="text-muted-foreground grid gap-2 px-3 pb-3 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <Rocket className="size-3.5" /> Started at
              </span>
              <time
                className="text-foreground text-right font-medium"
                dateTime={new Date(instance.started_at).toISOString()}
              >
                {formatRuntimeDate(instance.started_at)}
              </time>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> Terminates at
              </span>
              <time
                className="text-foreground text-right font-medium"
                dateTime={new Date(instance.terminates_at).toISOString()}
              >
                {formatRuntimeDate(instance.terminates_at)}
              </time>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <TimerReset className="size-3.5" /> Terminates in
              </span>
              <span className="text-foreground font-mono font-medium tabular-nums">
                {formatTimeRemaining(instance.terminates_at, now)}
              </span>
            </div>
          </div>

          <DropdownMenuSeparator />
          {instance.runtime_kind === "sandbox" ? (
            <DropdownMenuItem disabled>
              <CalendarClock />
              <span className="flex-1">Update expiration</span>
              <span className="text-muted-foreground text-xs">VM only</span>
            </DropdownMenuItem>
          ) : (
            <UpdateInstanceTimeDialog
              instanceId={instance.id}
              projectSessionId={projectSessionId}
            >
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <CalendarClock />
                Update expiration
              </DropdownMenuItem>
            </UpdateInstanceTimeDialog>
          )}
          <DropdownMenuItem
            disabled={
              terminateStatus.isPending ||
              disableTerminate.isPending ||
              terminateAfterDone === false
            }
            onSelect={() => {
              if (terminateStatus.isError) {
                void terminateStatus.refetch();
                return;
              }
              if (terminateAfterDone) setIsConfirmationOpen(true);
            }}
          >
            {terminateStatus.isPending || disableTerminate.isPending ? (
              <Loader2 className="animate-spin" />
            ) : terminateAfterDone === false ? (
              <TimerOff />
            ) : (
              <TimerReset />
            )}
            <span className="flex-1">Terminate after done</span>
            <span className="text-muted-foreground text-xs">
              {terminateStatus.isError
                ? "Retry"
                : terminateAfterDone === false
                  ? "Off"
                  : "On"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!instance.public_ip}
            onSelect={() => void copyValue("ip", instance.public_ip)}
          >
            {copiedValue === "ip" ? <Check /> : <Network />}
            <span className="flex-1">Copy IP address</span>
            {instance.public_ip ? (
              <span className="text-muted-foreground max-w-28 truncate font-mono text-xs">
                {instance.public_ip}
              </span>
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!sshCommand}
            onSelect={() => void copyValue("ssh", sshCommand)}
          >
            {copiedValue === "ssh" ? <Check /> : <Terminal />}
            <span className="flex-1">Copy SSH command</span>
            <Copy className="text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        title="Turn off terminate after done?"
        description="This runtime will keep running after its tasks finish and may continue using credits. It cannot be turned back on from the playground."
        confirmText="Turn off"
        onConfirm={() => {
          setIsConfirmationOpen(false);
          disableTerminate.mutate(undefined, {
            onSuccess: () => toast.success("Terminate after done turned off"),
            onError: (error) =>
              toast.error(error.message || "Could not update runtime setting"),
          });
        }}
      />
    </>
  );
}
