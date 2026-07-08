"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  FileCode2,
  Globe,
  Loader2,
  MoreHorizontal,
  Settings,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { ProjectInstanceStats } from "@/components/project/project-instance-stats";
import { OpencodeWebCard } from "@/components/opencode-web-card";
import { ShellToolsCard } from "@/components/shell-tools-card";
import { T3CodeCard } from "@/components/t3-code-card";
import { ProjectDomainsCard } from "@/components/project/project-domains-card";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { UpdateInstanceTimeDialog } from "@/components/dialogs/update-instance-time-dialog";
import { useGetInstanceById, useTerminateInstance } from "@/hooks/use-instance";
import {
  useAddAllowedIpToProject,
  useDeleteMultipleAllowedIpsFromProject,
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@/hooks/use-project";
import { useCurrentUserIp } from "@/hooks/use-ip";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";
import { ProjectInstanceTerminal } from "@/components/project/project-instance-terminal";
import { InstancePageState } from "./instance-page-state";
import { WebSocketProvider } from "@/hooks/use-websocket";

const formatDuration = (
  startedAt: unknown,
  terminatedAt: unknown,
  now: Date,
) => {
  if (!startedAt) return "N/A";

  const startDate = new Date(String(startedAt));
  if (Number.isNaN(startDate.getTime())) return "N/A";

  const endDate = terminatedAt ? new Date(String(terminatedAt)) : now;
  if (Number.isNaN(endDate.getTime())) return "N/A";

  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 0) return "N/A";

  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const formatTimeRemaining = (expiresAt: unknown, now: Date) => {
  if (!expiresAt) return "N/A";

  const expiresDate = new Date(String(expiresAt));
  if (Number.isNaN(expiresDate.getTime())) return "N/A";

  const remainingMs = expiresDate.getTime() - now.getTime();
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const getOpencodePassword = (config: unknown) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const { opencodePassword } = config as { opencodePassword?: unknown };

  if (typeof opencodePassword !== "string" || !opencodePassword.trim()) {
    return null;
  }

  return opencodePassword;
};

const getVibeongoLocalToken = (config: unknown) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const { vibeongoLocalToken } = config as { vibeongoLocalToken?: unknown };

  if (typeof vibeongoLocalToken !== "string" || !vibeongoLocalToken.trim()) {
    return null;
  }

  return vibeongoLocalToken;
};

export default function ClientView({ instanceId }: { instanceId: string }) {
  const {
    data: instance,
    isLoading: isInstanceLoading,
    isError: isInstanceError,
  } = useGetInstanceById(instanceId);
  const { data: projectDomainsData, isLoading: isLoadingDomains } =
    useGetProjectDomainsById(instance?.project_id || "");
  const addAllowedIpMutation = useAddAllowedIpToProject();
  const deleteMultipleAllowedIpsMutation =
    useDeleteMultipleAllowedIpsFromProject();
  const {
    mutateAsync: assignDomainsToInstance,
    isPending: isAssigningDomains,
  } = useUpdateProjectRoutingTargetInstance();
  const { mutateAsync: terminateInstance, isPending } = useTerminateInstance(
    instance?.project_id || "",
  );
  const [terminalConnectionStatus, setTerminalConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [now, setNow] = useState(() => new Date());
  const [sshCopied, setSshCopied] = useState(false);
  const [serverLogs, setServerLogs] = useState("");
  const [isRestartingFinalScript, setIsRestartingFinalScript] = useState(false);
  const serverLogsRef = useRef<HTMLDivElement | null>(null);
  const mobileServerLogsRef = useRef<HTMLDivElement | null>(null);
  const [isCurrentIpDialogOpen, setIsCurrentIpDialogOpen] = useState(false);
  const [hasDismissedCurrentIpDialog, setHasDismissedCurrentIpDialog] =
    useState(false);
  const isTerminated =
    instance?.state === "terminated" || !!instance?.terminated_at;

  const isTargetInstance =
    projectDomainsData?.target_instance_id === instanceId;

  const vibeongoDomain = isTargetInstance
    ? projectDomainsData?.proxy_domains?.find(
        (domain) => domain.target_port === 3101,
      )?.domain
    : null;

  const opencodeCodeDomain = isTargetInstance
    ? projectDomainsData?.proxy_domains?.find(
        (domain) => domain.target_port === 4096,
      )?.domain
    : null;

  const t3CodeDomain = isTargetInstance
    ? projectDomainsData?.proxy_domains?.find(
        (domain) => domain.target_port === 3773,
      )?.domain
    : null;

  const { data: currentUserIp, isLoading: isCurrentIpLoading } =
    useCurrentUserIp(vibeongoDomain);

  const Instance_IP = instance?.public_ip || "localhost";
  const currentIp = currentUserIp?.trim() ?? "";
  const allowedIps = projectDomainsData?.allowed_ips ?? [];
  const isCurrentIpAllowed =
    !!currentIp &&
    allowedIps.some((allowedIp) => allowedIp.ip.trim() === currentIp);
  //
  // NOTE: for local test
  //
  // const domainFor8080 = "localhost:8080";
  // const domainFor4096 = "localhost:4096";
  // const Instance_IP = "localhost";
  //
  const terminalHealthCheckUrl = vibeongoDomain
    ? `https://${vibeongoDomain}`
    : null;
  const sshCommand = instance?.public_ip
    ? `ssh ubuntu@${String(Instance_IP)}`
    : null;
  const opencodePassword = getOpencodePassword(instance?.config);
  const vibeongoLocalToken = getVibeongoLocalToken(instance?.config);
  const spunUpFor = formatDuration(
    instance?.started_at,
    instance?.terminated_at,
    now,
  );
  const expiresIn = formatTimeRemaining(instance?.terminates_at, now);
  const expiresAtTitle = instance?.terminates_at
    ? new Date(instance.terminates_at).toISOString()
    : undefined;

  const handleTerminate = async () => {
    if (!instance || isTerminated) {
      return;
    }

    const toastId = toast.loading("Terminating instance...");
    try {
      await terminateInstance(instance.id);
      toast.success("Instance terminated", { id: toastId });
    } catch {
      toast.error("Failed to terminate instance", { id: toastId });
    }
  };

  const handleCopySshCommand = async () => {
    if (!sshCommand) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sshCommand);
      setSshCopied(true);
      setTimeout(() => setSshCopied(false), 1000);
    } catch {
      // Silently handle error, could add visual feedback here if needed
    }
  };

  const handleAssignDomains = async () => {
    if (!instance || isTerminated || isTargetInstance) {
      return;
    }

    const toastId = toast.loading("Assigning project domains...");

    try {
      if (!instance.project_id) return;
      await assignDomainsToInstance({
        id: instance.project_id,
        instanceId: instance.id,
      });
      toast.success("Project domains now point to this instance", {
        id: toastId,
      });
    } catch {
      toast.error("Failed to assign project domains", { id: toastId });
    }
  };

  const handleAddAllowedIp = async (ip: string) => {
    const normalizedIp = ip.trim();

    if (!normalizedIp) {
      toast.error("Please enter an IP address");
      return;
    }

    if (!instance?.project_id) {
      toast.error("Project is not available");
      return;
    }

    const toastId = toast.loading(
      normalizedIp === currentIp
        ? "Adding current IP..."
        : "Adding allowed IP...",
    );

    try {
      await addAllowedIpMutation.mutateAsync({
        id: instance.project_id,
        ip: normalizedIp,
      });
      toast.success(
        normalizedIp === currentIp ? "Current IP added" : "Allowed IP added",
        { id: toastId },
      );
      if (normalizedIp === currentIp) {
        setIsCurrentIpDialogOpen(false);
        setHasDismissedCurrentIpDialog(true);
      }
      window.location.reload();
    } catch {
      toast.error(
        normalizedIp === currentIp
          ? "Failed to add current IP"
          : "Failed to add allowed IP",
        { id: toastId },
      );
      throw new Error("Failed to add allowed IP");
    }
  };

  const handleDeleteOtherAllowedIps = async (ids: string[]) => {
    if (!instance?.project_id) {
      toast.error("Project is not available");
      return;
    }

    if (ids.length === 0) {
      toast.info("No other allowed IPs to remove");
      return;
    }

    const toastId = toast.loading("Removing other allowed IPs...");

    try {
      await deleteMultipleAllowedIpsMutation.mutateAsync({
        id: instance.project_id,
        ids,
      });
      toast.success("Other allowed IPs removed", { id: toastId });
    } catch {
      toast.error("Failed to remove other allowed IPs", { id: toastId });
      throw new Error("Failed to remove other allowed IPs");
    }
  };

  const handleRestartFinalScript = async () => {
    if (
      !vibeongoDomain ||
      !vibeongoLocalToken ||
      isTerminated ||
      isRestartingFinalScript
    ) {
      return;
    }

    const toastId = toast.loading("Restarting dev script...");
    setIsRestartingFinalScript(true);

    try {
      await axios.post(
        `https://${vibeongoDomain}/restart-final-script`,
        {},
        {
          headers: {
            Authorization: `Bearer ${vibeongoLocalToken}`,
          },
        },
      );
      toast.success("Dev script restarted", { id: toastId });
    } catch {
      toast.error("Failed to restart dev script", { id: toastId });
    } finally {
      setIsRestartingFinalScript(false);
    }
  };

  useEffect(() => {
    if (!terminalHealthCheckUrl) {
      setTerminalConnectionStatus("disconnected");
      return;
    }

    let isDisposed = false;

    const checkInstanceConnection = async () => {
      setTerminalConnectionStatus("checking");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 6000);

      try {
        const response = await fetch(terminalHealthCheckUrl, {
          method: "GET",
          signal: controller.signal,
        });

        if (!isDisposed) {
          setTerminalConnectionStatus(
            response.status === 200 ? "connected" : "disconnected",
          );
        }
      } catch {
        if (!isDisposed) {
          setTerminalConnectionStatus("disconnected");
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void checkInstanceConnection();

    const intervalId = window.setInterval(() => {
      void checkInstanceConnection();
    }, 30000);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [terminalHealthCheckUrl]);

  useEffect(() => {
    if (!instance || isTerminated) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [instance, isTerminated]);

  useEffect(() => {
    const handleServerLogs = (event: Event) => {
      const logsEvent = event as CustomEvent<unknown>;
      const logs =
        typeof logsEvent.detail === "string"
          ? logsEvent.detail
          : JSON.stringify(logsEvent.detail, null, 2);

      setServerLogs(logs);
    };

    window.addEventListener("vps-logs", handleServerLogs);
    return () => {
      window.removeEventListener("vps-logs", handleServerLogs);
    };
  }, []);

  useEffect(() => {
    for (const logsElement of [
      serverLogsRef.current,
      mobileServerLogsRef.current,
    ]) {
      if (logsElement) {
        logsElement.scrollTop = logsElement.scrollHeight;
      }
    }
  }, [serverLogs]);

  useEffect(() => {
    if (
      isLoadingDomains ||
      isCurrentIpLoading ||
      hasDismissedCurrentIpDialog ||
      !instance?.project_id ||
      !projectDomainsData ||
      !currentIp ||
      isCurrentIpAllowed
    ) {
      return;
    }

    setIsCurrentIpDialogOpen(true);
  }, [
    currentIp,
    hasDismissedCurrentIpDialog,
    instance?.project_id,
    isCurrentIpAllowed,
    isCurrentIpLoading,
    isLoadingDomains,
    projectDomainsData,
  ]);

  if (isInstanceLoading) {
    return <InstancePageState type="loading" />;
  }

  if (isInstanceError || !instance) {
    return <InstancePageState type="not-found" />;
  }

  if (isTerminated) {
    return (
      <InstancePageState
        type="terminated"
        startedAt={instance.started_at}
        terminatedAt={instance.terminated_at}
      />
    );
  }

  const renderControls = () => {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          type="button"
          disabled={!sshCommand}
          aria-label="Copy SSH command"
          title="Copy SSH command"
          className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
          onClick={() => {
            void handleCopySshCommand();
          }}
        >
          {sshCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="sr-only sm:not-sr-only">SSH</span>
        </Button>
        <Button
          size="icon-sm"
          variant={isTargetInstance ? "secondary" : "outline"}
          type="button"
          disabled={isTerminated || isTargetInstance || isAssigningDomains}
          aria-label={
            isTargetInstance ? "Domains active" : "Assign project domains"
          }
          title={isTargetInstance ? "Domains active" : "Assign project domains"}
          className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
          onClick={() => {
            void handleAssignDomains();
          }}
        >
          {isAssigningDomains ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only sm:not-sr-only">Assigning...</span>
            </>
          ) : isTargetInstance ? (
            <>
              <Check className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Domains Active</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Assign Domains</span>
            </>
          )}
        </Button>

        <ConfirmationDialog
          title="Terminate instance"
          description="Are you sure you want to terminate this instance? This action cannot be undone."
          confirmText="Terminate"
          isDestructive
          onConfirm={() => {
            void handleTerminate();
          }}
        >
          <Button
            size="icon-sm"
            variant="destructive"
            type="button"
            disabled={isPending || isTerminated}
            aria-label={isTerminated ? "Terminated" : "Terminate instance"}
            title={isTerminated ? "Terminated" : "Terminate instance"}
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Terminating...</span>
              </>
            ) : isTerminated ? (
              <>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Terminated</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Terminate</span>
              </>
            )}
          </Button>
        </ConfirmationDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              type="button"
              aria-label="Project menu"
              title="Project menu"
              className="sm:h-9 sm:w-9"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <UpdateInstanceTimeDialog instanceId={instance.id}>
              <DropdownMenuItem
                onSelect={(event) => event.preventDefault()}
              >
                <Clock3 className="h-4 w-4" />
                Update Expiration
              </DropdownMenuItem>
            </UpdateInstanceTimeDialog>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/project/${instance.project_id}/edit`}>
                <Settings className="h-4 w-4" />
                Edit Config
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/dashboard/project/${instance.project_id}/manage/env`}
              >
                <FileCode2 className="h-4 w-4" />
                Edit Envs
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <WebSocketProvider
      socketUrl={vibeongoDomain}
      socketToken={vibeongoLocalToken}
    >
      <div className="w-full max-w-full min-w-0 space-y-12 overflow-x-hidden p-4 md:p-8">
        <ConfirmationDialog
          open={isCurrentIpDialogOpen}
          onOpenChange={(open) => {
            setIsCurrentIpDialogOpen(open);
            if (!open) {
              setHasDismissedCurrentIpDialog(true);
            }
          }}
          title="Allow current IP"
          description={`Your current IP ${currentIp || "is not available"} is not in this project's allowlist. Add it so project domains can be accessed from this device.`}
          confirmText="Add current IP"
          cancelText="Not now"
          onConfirm={() => {
            void handleAddAllowedIp(currentIp);
          }}
        />

        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 text-3xl font-bold tracking-tight">
              Instance
              <span
                className={
                  terminalConnectionStatus === "connected"
                    ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                    : terminalConnectionStatus === "checking"
                      ? "h-2.5 w-2.5 rounded-full bg-amber-500"
                      : "h-2.5 w-2.5 rounded-full bg-red-500"
                }
              />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Spun up for <span className="font-medium">{spunUpFor}</span>{" "}
              Terminates in{" "}
              <span className="font-medium" title={expiresAtTitle}>
                {expiresIn}
              </span>
            </p>
          </div>

          {renderControls()}
        </div>

        {!isLoadingDomains && !isTargetInstance ? (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
            <TriangleAlert />
            <AlertTitle>Project domains are not assigned</AlertTitle>
            <AlertDescription>
              Assign this instance as the project domain target to enable the
              terminal, usage stats, and web services.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoadingDomains ? (
          <Card className="text-muted-foreground flex items-center justify-center p-6 text-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Loading instance routing...
          </Card>
        ) : !vibeongoDomain ? (
          <Card className="text-muted-foreground p-6 text-center">
            To view the Terminal, CPU Usage, and Opencode Web, please make this
            instance the default for the project. You need to assign domains to
            this instance.
          </Card>
        ) : (
          <>
            <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <div className="bg-card text-card-foreground relative hidden min-h-64 overflow-hidden border lg:block lg:min-h-0">
                <div
                  ref={serverLogsRef}
                  className="absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="text-muted-foreground px-3 pt-2 text-xs font-medium">
                    Logs
                  </div>
                  <pre className="text-card-foreground px-3 pt-1 pb-3 font-mono text-sm break-words whitespace-pre-wrap">
                    {serverLogs || "Waiting for server logs..."}
                  </pre>
                </div>
              </div>
              <div className="min-w-0 space-y-3">
                <ProjectInstanceInfoCard
                  instance={instance}
                  isRestartingFinalScript={isRestartingFinalScript}
                  onRestartFinalScript={handleRestartFinalScript}
                />
                <ProjectInstanceStats />
                <OpencodeWebCard
                  domainFor8080={vibeongoDomain || null}
                  domainFor4096={opencodeCodeDomain || null}
                  isTerminated={isTerminated}
                  opencodePassword={opencodePassword}
                />
                <T3CodeCard
                  domainFor3773={t3CodeDomain || null}
                  isTerminated={isTerminated}
                />
              </div>
            </div>
            <ProjectInstanceTerminal />
            <ShellToolsCard isTerminated={isTerminated} />
            <div className="bg-card text-card-foreground relative h-64 overflow-hidden lg:hidden">
              <div
                ref={mobileServerLogsRef}
                className="absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="text-muted-foreground px-3 pt-2 text-xs font-medium">
                  Logs
                </div>
                <pre className="text-card-foreground px-3 pt-1 pb-3 font-mono text-sm break-words whitespace-pre-wrap">
                  {serverLogs || "Waiting for server logs..."}
                </pre>
              </div>
            </div>
          </>
        )}

        <ProjectDomainsCard
          projectId={instance.project_id || ""}
          currentIp={currentIp}
          isCurrentIpLoading={isCurrentIpLoading}
          isCurrentIpAllowed={isCurrentIpAllowed}
          isAddingAllowedIp={addAllowedIpMutation.isPending}
          isDeletingOtherAllowedIps={deleteMultipleAllowedIpsMutation.isPending}
          onAddAllowedIp={handleAddAllowedIp}
          onDeleteOtherAllowedIps={handleDeleteOtherAllowedIps}
        />
      </div>
    </WebSocketProvider>
  );
}
