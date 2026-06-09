"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Globe,
  Loader2,
  RotateCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { ProjectInstanceStats } from "@/components/project/project-instance-stats";
import { OpencodeWebCard } from "@/components/opencode-web-card";
import { ProjectDomainsCard } from "@/components/project/project-domains-card";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { useGetInstanceById, useTerminateInstance } from "@/hooks/use-instance";
import {
  useAddAllowedIpToProject,
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@/hooks/use-project";
import { useCurrentUserIp } from "@/hooks/use-ip";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { toast } from "sonner";
import axios from "axios";
import { ProjectInstanceTerminal } from "@/components/project/project-instance-terminal";
import { InstancePageState } from "./instance-page-state";

export default function ClientView({ instanceId }: { instanceId: string }) {
  const {
    data: instance,
    isLoading: isInstanceLoading,
    isError: isInstanceError,
  } = useGetInstanceById(instanceId);
  const { data: projectDomainsData, isLoading: isLoadingDomains } =
    useGetProjectDomainsById(instance?.project_id || "");
  const { data: currentUserIp, isLoading: isCurrentIpLoading } =
    useCurrentUserIp();
  const addAllowedIpMutation = useAddAllowedIpToProject();
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
  const [sshCopied, setSshCopied] = useState(false);
  const [serverLogs, setServerLogs] = useState("");
  const serverLogsRef = useRef<HTMLDivElement | null>(null);
  const [isCurrentIpDialogOpen, setIsCurrentIpDialogOpen] = useState(false);
  const [hasDismissedCurrentIpDialog, setHasDismissedCurrentIpDialog] =
    useState(false);
  const isTerminated =
    instance?.state === "terminated" || !!instance?.terminated_at;

  const isTargetInstance =
    projectDomainsData?.target_instance_id === instanceId;

  const domainFor8080 = isTargetInstance
    ? projectDomainsData?.proxy_domains?.find(
        (domain) => domain.target_port === 8080,
      )?.domain
    : null;

  const domainFor4096 = isTargetInstance
    ? projectDomainsData?.proxy_domains?.find(
        (domain) => domain.target_port === 4096,
      )?.domain
    : null;

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
  const terminalHealthCheckUrl = domainFor8080
    ? `https://${domainFor8080}`
    : null;
  const sshCommand = instance?.public_ip
    ? `ssh ubuntu@${String(Instance_IP)}`
    : null;

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

  const handleReboot = async () => {
    if (!instance || isTerminated) {
      return;
    }
    try {
      const rebootUrl = domainFor8080
        ? `https://${domainFor8080}/reboot`
        : `http://${Instance_IP}:8080/reboot`;
      const res = await axios.post(rebootUrl, {});
      if (res.status === 200) {
        toast.success("Server rebooted successfully");
        await new Promise((res) => setTimeout(res, 2000));
        window.location.reload();
      }
    } catch {
      toast.error("Failed to reboot the server");
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
    const logsElement = serverLogsRef.current;
    if (logsElement) {
      logsElement.scrollTop = logsElement.scrollHeight;
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

  const Controls = () => {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={handleReboot}
          disabled={!domainFor8080}
          aria-label="Reboot"
          title="Reboot"
          className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
        >
          <RotateCw className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Reboot</span>
        </Button>
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
      </div>
    );
  };

  return (
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
        </div>

        <Controls />
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

      <ProjectInstanceInfoCard instance={instance} />

      {isLoadingDomains ? (
        <Card className="text-muted-foreground flex items-center justify-center p-6 text-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading instance routing...
        </Card>
      ) : !domainFor8080 ? (
        <Card className="text-muted-foreground p-6 text-center">
          To view the Terminal, CPU Usage, and Opencode Web, please make this
          instance the default for the project. You need to assign domains to
          this instance.
        </Card>
      ) : (
        <>
          <ProjectInstanceStats />
          <OpencodeWebCard
            domainFor8080={domainFor8080 || null}
            domainFor4096={domainFor4096 || null}
            isTerminated={isTerminated}
          />
          <div className="space-y-3">
            <ProjectInstanceTerminal
              domain={domainFor8080 || null}
              hideControls
              hideHeader
            />
            <div className="relative h-[32rem] overflow-hidden bg-[#111111]">
              <div
                ref={serverLogsRef}
                className="h-full overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="px-3 pt-2 text-xs font-medium text-zinc-500">
                  Logs
                </div>
                <pre className="whitespace-pre-wrap break-words px-3 pb-3 pt-1 font-mono text-sm text-zinc-300">
                  {serverLogs || "Waiting for server logs..."}
                </pre>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/90 via-black/35 to-transparent" />
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
        onAddAllowedIp={handleAddAllowedIp}
      />
    </div>
  );
}
