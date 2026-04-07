"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Loader2, Trash2, RotateCw } from "lucide-react";

import { ProjectInstanceTerminal } from "@/components/project/project-instance-terminal";
import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { OpencodeWebCard } from "@/components/opencode-web-card";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { useGetInstanceById, useTerminateInstance } from "@/hooks/use-instance";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toast } from "sonner";
import axios from "axios";

export default function ClientView({ instanceId }: { instanceId: string }) {
  const { data: instance } = useGetInstanceById(instanceId);
  const { mutateAsync: terminateInstance, isPending } = useTerminateInstance(
    instance?.project_id || "",
  );
  const [terminalConnectionStatus, setTerminalConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [sshCopied, setSshCopied] = useState(false);
  const isTerminated =
    instance?.state === "terminated" || !!instance?.terminated_at;

  // const Instance_IP = instance?.public_ip || "localhost";
  const Instance_IP = "localhost";
  const terminalHealthCheckUrl = instance?.public_ip
    ? `http://${Instance_IP}:8080`
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

  const handleReboot = async () => {
    if (!instance || isTerminated) {
      return;
    }
    try {
      const res = await axios.post(`http://${Instance_IP}:8080/reboot`, {});
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

  if (!instance) return <Card>Instance not found</Card>;

  const Controls = () => {
    return (
      <div className="flex items-center gap-2">
        <Button size={"lg"} variant="outline" onClick={handleReboot}>
          <RotateCw className="h-4 w-4" />
          Reboot
        </Button>
        <Button
          size="lg"
          variant="outline"
          type="button"
          disabled={!sshCommand}
          onClick={() => {
            void handleCopySshCommand();
          }}
        >
          {sshCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          SSH
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
            size="lg"
            variant="destructive"
            type="button"
            disabled={isPending || isTerminated}
          >
            <Trash2 className="h-3 w-3" />
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Terminating...
              </>
            ) : isTerminated ? (
              "Terminated"
            ) : (
              "Terminate"
            )}
          </Button>
        </ConfirmationDialog>
      </div>
    );
  };

  return (
    <div className="space-y-12 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
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

      <ProjectInstanceInfoCard instance={instance} />

      <div>VPS stats</div>
      <OpencodeWebCard publicIp={Instance_IP} isTerminated={isTerminated} />

      <ProjectInstanceTerminal publicIp={Instance_IP} hideControls />
    </div>
  );
}
